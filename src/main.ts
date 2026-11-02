import { Component, ItemView, MarkdownRenderer, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, WorkspaceLeaf, requestUrl, setIcon, setTooltip, type App, type Debouncer, type DropdownComponent } from "obsidian";
import { assertModeTool, readTurnText, runAgent, systemPrompt, toolsForMode, type ChatMessage } from "./agent.ts";
import { contextLabel, newSession, nextContextUsed, sessionTitle, sessionsFromSaved, stripImages, type ChatLine, type Session } from "./chats.ts";
import { listedModels, modelMenuLabel, modelNotes, type ListedModel } from "./models.ts";
import { capacitorOptions, httpRoute, readHttpResult, withDeadline, type HttpInit } from "./http.ts";
import { AGENT_MODES, assignProviderBase, chatCompletionsUrl, freshSettings, MAX_STEPS, modelsEndpoint, newProviderId, presetById, PROVIDER_PRESETS, providerCanList, providerFromPreset, providerLabel, providerNeedsKey, requestHeaders, settingsFromSaved, type AgentMode, type AgentSettings, type Provider } from "./settings.ts";
import { readOpenNote, writeOpenNote, type OpenEditor } from "./note-write.ts";
import { dispatchTool, type VaultFs } from "./vault.ts";

const VIEW = "obsidian-agent";

export default class AgentPlugin extends Plugin {
  settings: AgentSettings = freshSettings();
  sessions: Session[] = [];
  sessionId = "";
  lastNote = "";
  focusPath = "";
  focusFollow = true;
  running = false;
  stop = false;
  view: AgentView | null = null;

  async onload() {
    await this.loadSettings();
    this.registerView(VIEW, (leaf) => new AgentView(leaf, this));
    this.addRibbonIcon("bot", "Агент", () => this.activate());
    this.addCommand({ id: "open", name: "Открыть", callback: () => this.activate() });
    this.addCommand({ id: "new-chat", name: "Новый чат", callback: () => void this.newChat() });
    this.addSettingTab(new AgentSettingTab(this.app, this));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.rememberNote()));
    this.rememberNote();
  }

  private rememberNote() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view?.file) return;
    this.lastNote = view.file.path;
    if (this.focusPath === view.file.path) return;
    this.focusPath = view.file.path;
    this.focusFollow = true;
    void this.saveSettings();
    this.paint();
  }

  openNotePath(): string {
    const active = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (active?.file) return active.file.path;
    const open: string[] = [];
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (view instanceof MarkdownView && view.file) open.push(view.file.path);
    }
    if (this.lastNote && open.includes(this.lastNote)) return this.lastNote;
    if (open.length === 1) return open[0];
    return "";
  }

  async focusOpenNote() {
    this.rememberNote();
    let path = this.markdownView()?.file?.path ?? "";
    if (!path) {
      for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
        const view = leaf.view;
        if (view instanceof MarkdownView && view.file) {
          path = view.file.path;
          break;
        }
      }
    }
    if (!path) {
      new Notice("нет открытой заметки");
      return;
    }
    await this.setFocus(path, true);
  }

  async setFocus(path: string, follow: boolean) {
    this.focusPath = path;
    this.focusFollow = follow;
    await this.saveSettings();
    this.paint();
  }

  private markdownView(): MarkdownView | null {
    const active = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (active?.file) return active;
    if (!this.lastNote) return null;
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (view instanceof MarkdownView && view.file?.path === this.lastNote) return view;
    }
    return null;
  }

  async loadSettings() {
    const saved = await this.loadData();
    this.settings = settingsFromSaved(saved);
    const chats = sessionsFromSaved(saved);
    if (!chats) {
      const session = newSession();
      this.sessions = [session];
      this.sessionId = session.id;
    } else {
      this.sessions = chats.sessions;
      this.sessionId = chats.sessionId;
    }
    if (saved && typeof saved === "object") {
      const data = saved as Record<string, unknown>;
      if (typeof data.focusPath === "string") this.focusPath = data.focusPath;
      if (typeof data.focusFollow === "boolean") this.focusFollow = data.focusFollow;
    }
    const migrate = !saved || typeof saved !== "object" || !("providers" in saved) || !("sessions" in saved);
    if (saved && typeof saved === "object" && migrate) await this.saveSettings();
  }

  activeSession(): Session | null {
    return this.sessions.find((item) => item.id === this.sessionId) ?? null;
  }

  async newChat() {
    if (this.running) {
      new Notice("сначала останови текущий запрос");
      return;
    }
    const current = this.activeSession();
    if (current && current.lines.length === 0 && current.history.length === 0) {
      new Notice("этот чат уже пустой");
      return;
    }
    const session = newSession();
    this.sessions.unshift(session);
    this.sessionId = session.id;
    await this.saveSettings();
    this.paint();
  }

  async openSession(id: string) {
    if (this.running) {
      new Notice("сначала останови текущий запрос");
      this.paint();
      return;
    }
    if (!this.sessions.some((item) => item.id === id)) {
      new Notice("нет чата");
      this.paint();
      return;
    }
    this.sessionId = id;
    await this.saveSettings();
    this.paint();
  }

  async deleteSession() {
    if (this.running) {
      new Notice("сначала останови текущий запрос");
      return;
    }
    const current = this.activeSession();
    if (!current) {
      new Notice("нет чата");
      return;
    }
    this.sessions = this.sessions.filter((item) => item.id !== current.id);
    this.sessionId = "";
    await this.saveSettings();
    this.paint();
  }

  activeProvider(): Provider | null {
    return this.settings.providers.find((item) => item.id === this.settings.activeId) ?? null;
  }

  async fetchModels(provider: Provider): Promise<ListedModel[]> {
    const res = await this.callApi(provider, {
      url: modelsEndpoint(provider),
      method: "GET",
      headers: requestHeaders(provider, false),
    });
    if (res.status < 200 || res.status >= 300) {
      const body = res.text.slice(0, 500);
      throw new Error("список моделей ответил " + res.status + (body ? ": " + body : ""));
    }
    return listedModels(JSON.parse(res.text));
  }

  async saveSettings() {
    const sessions = this.sessions.map((session) => {
      const stored = stripImages(session.history);
      return { ...session, history: stored.history, imagesOmitted: session.imagesOmitted || stored.imagesOmitted };
    });
    await this.saveData({ ...this.settings, sessions, sessionId: this.sessionId, focusPath: this.focusPath, focusFollow: this.focusFollow });
  }

  async activate() {
    const existing = this.app.workspace.getLeavesOfType(VIEW);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  paint() {
    this.view?.paint();
  }

  push(line: ChatLine) {
    const session = this.activeSession();
    if (!session) throw new Error("нет чата");
    session.lines.push(line);
    if (line.kind === "user") session.title = sessionTitle(session.lines);
    this.paint();
  }

  async ask(task: string) {
    if (this.running) return;
    const session = this.activeSession();
    if (!session) {
      new Notice("нет чата");
      return;
    }
    const provider = this.activeProvider();
    if (!provider) {
      this.push({ kind: "error", text: "выбери провайдера в настройках плагина" });
      return;
    }
    const model = provider.model.trim();
    const base = provider.base.trim();
    if (providerNeedsKey(provider) && !provider.key.trim()) {
      this.push({ kind: "error", text: "укажи ключ в настройках плагина" });
      return;
    }
    if (!model || !base) {
      this.push({ kind: "error", text: "укажи адрес API и модель" });
      return;
    }
    const active = this.focusPath.trim();
    const view = this.markdownView();
    const selected = view?.file?.path === active ? view.editor.getSelection() : "";
    const where = active ? "Фокус: " + active : "Фокус не выбран.";
    const prompt = [where, selected ? "Выделение:\n" + selected : "", "Задание:\n" + task].filter(Boolean).join("\n\n");
    session.history.push({ role: "user", content: prompt });
    this.push({ kind: "user", text: task });
    this.running = true;
    this.stop = false;
    this.paint();
    const mode = this.settings.mode;
    const tools = toolsForMode(mode);
    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt(active, mode) }, ...session.history.filter((item) => item.role !== "system")];
    try {
      await runAgent({
        messages,
        maxSteps: this.settings.maxSteps,
        shouldStop: () => this.stop,
        onLine: (line) => this.push({ kind: "tool", text: line }),
        post: async (batch) => {
          const turn = await this.post(provider, model, batch, tools);
          if (turn.usage !== null) session.contextUsed = nextContextUsed(session.contextUsed, turn.usage);
          this.paint();
          return turn;
        },
        callTool: (name, args) => {
          assertModeTool(mode, name);
          return dispatchTool(this.vaultFs(), name, args);
        },
      });
      const last = messages[messages.length - 1];
      const text = last?.role === "assistant" && typeof last.content === "string" ? last.content : "";
      if (!text.trim()) this.push({ kind: "error", text: "модель ничего не ответила" });
      else this.push({ kind: "assistant", text });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.push({ kind: "error", text: message });
    } finally {
      session.history = messages.filter((item) => item.role !== "system");
      this.running = false;
      this.stop = false;
      this.paint();
      await this.saveSettings();
    }
  }

  private async post(provider: Provider, model: string, messages: ChatMessage[], tools: ReturnType<typeof toolsForMode>) {
    const res = await this.callApi(provider, {
      url: chatCompletionsUrl(provider),
      method: "POST",
      headers: requestHeaders(provider, true),
      body: JSON.stringify({ model, messages, tools, stream: true, stream_options: { include_usage: true } }),
    });
    if (res.status < 200 || res.status >= 300) {
      const body = res.text.slice(0, 500);
      throw new Error("модель ответила " + res.status + (body ? ": " + body : ""));
    }
    return readTurnText(res.text);
  }

  private async callApi(provider: Provider, init: HttpInit): Promise<{ status: number; text: string }> {
    const route = httpRoute();
    const seconds = provider.timeout;
    if (seconds !== undefined && route.kind === "unavailable") {
      throw new Error("таймаут задан, но на устройстве нет CapacitorHttp");
    }
    if (seconds !== undefined && route.kind === "capacitor") {
      const res = await route.request.request(capacitorOptions(init, seconds * 1000));
      return readHttpResult(res.status, res.data);
    }
    const pending = requestUrl({
      url: init.url,
      method: init.method,
      headers: init.headers,
      body: init.body,
      throw: false,
    }).then((res) => ({ status: res.status, text: res.text }));
    if (seconds === undefined) return pending;
    return withDeadline(pending, seconds * 1000, "таймаут " + seconds + " с");
  }

  private vaultFs(): VaultFs {
    const app = this.app;
    return {
      async find(path) {
        const file = app.vault.getAbstractFileByPath(path);
        if (!file) return null;
        return { path: file.path, folder: file instanceof TFolder };
      },
      async findMany(name) {
        const base = name.split("/").pop() || name;
        return app.vault.getFiles().filter((file) => file.path === name || file.path.endsWith("/" + name) || file.name === base).map((file) => file.path);
      },
      async read(path) {
        const file = app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile)) throw new Error("нет файла " + path);
        return readOpenNote(openEditors(app, path), await app.vault.read(file));
      },
      async write(path, content) {
        const file = app.vault.getAbstractFileByPath(path);
        if (file instanceof TFolder) throw new Error("это папка");
        if (file instanceof TFile) {
          await writeOpenNote(openEditors(app, path), { read: () => app.vault.read(file), modify: (data) => app.vault.modify(file, data) }, content);
          return;
        }
        const slash = path.lastIndexOf("/");
        if (slash > 0) {
          const parent = path.slice(0, slash);
          if (!(app.vault.getAbstractFileByPath(parent) instanceof TFolder)) throw new Error("нет папки " + parent);
        }
        await app.vault.create(path, content);
      },
      async bytes(path) {
        const file = app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile)) throw new Error("нет файла " + path);
        return new Uint8Array(await app.vault.readBinary(file));
      },
      async children(path) {
        const folder = path ? app.vault.getAbstractFileByPath(path) : app.vault.getRoot();
        if (!folder) throw new Error("нет папки " + path);
        if (!(folder instanceof TFolder)) throw new Error("это не папка");
        return folder.children.map((child) => ({ path: child.path, folder: child instanceof TFolder }));
      },
      async mkdir(path) {
        const existing = app.vault.getAbstractFileByPath(path);
        if (existing instanceof TFolder) throw new Error("папка уже есть");
        if (existing) throw new Error("это файл: " + path);
        const slash = path.lastIndexOf("/");
        if (slash > 0) {
          const parent = path.slice(0, slash);
          if (!(app.vault.getAbstractFileByPath(parent) instanceof TFolder)) throw new Error("нет папки " + parent);
        }
        await app.vault.createFolder(path);
      },
    };
  }
}

function openEditors(app: App, path: string): OpenEditor[] {
  const editors: OpenEditor[] = [];
  for (const leaf of app.workspace.getLeavesOfType("markdown")) {
    const view = leaf.view;
    if (!(view instanceof MarkdownView) || view.file?.path !== path) continue;
    const mode = view.getMode();
    if (mode !== "source" && mode !== "preview") throw new Error("неизвестный режим заметки");
    editors.push({
      mode,
      get: () => view.editor.getValue(),
      set: (content) => view.editor.setValue(content),
      cancelPending: () => cancelPendingSave(view),
      save: () => view.save(),
    });
  }
  return editors;
}

function cancelPendingSave(view: MarkdownView) {
  const save = view.requestSave as Debouncer<[], Promise<void>>;
  if (typeof save.cancel !== "function") throw new Error("отложенная запись редактора не отменяется");
  save.cancel();
}

function iconButton(parent: HTMLElement, icon: string, label: string): HTMLElement {
  const button = parent.createDiv({
    cls: "clickable-icon agent-icon",
    attr: { role: "button", tabindex: "0", "aria-label": label },
  });
  setIcon(button, icon);
  setTooltip(button, label);
  button.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    button.click();
  });
  return button;
}

const MODE_HINT: Record<AgentMode, string> = {
  chat: "читает, ничего не пишет",
  write: "читает и правит файлы",
  all: "читает, правит файлы и папки",
};

function isAgentMode(value: string | undefined): value is AgentMode {
  return value === "chat" || value === "write" || value === "all";
}

function modelKey(model: ListedModel): string {
  const images = model.images === null ? "" : model.images ? "1" : "0";
  return model.id + "\0" + (model.pay ?? "") + "\0" + images;
}

function picker(parent: HTMLElement): HTMLSelectElement {
  const wrap = parent.createDiv({ cls: "agent-picker" });
  const select = wrap.createEl("select");
  wrap.createDiv({ cls: "agent-picker-mark", attr: { "aria-hidden": "true" } });
  return select;
}

async function copyLine(text: string) {
  const write = navigator.clipboard?.writeText;
  if (typeof write !== "function") {
    new Notice("буфер обмена недоступен");
    return;
  }
  try {
    await write.call(navigator.clipboard, text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    new Notice(message || "не удалось скопировать");
    return;
  }
  new Notice("скопировано");
}

class AgentView extends ItemView {
  plugin: AgentPlugin;
  logEl: HTMLElement | null = null;
  inputEl: HTMLTextAreaElement | null = null;
  sendEl: HTMLElement | null = null;
  providerEl: HTMLSelectElement | null = null;
  providerSignature = "";
  modelTrigger: HTMLElement | null = null;
  modelLabel: HTMLElement | null = null;
  modelMenu: HTMLElement | null = null;
  modelOpen = false;
  modelSignature = "";
  chipEl: HTMLElement | null = null;
  chipLabel: HTMLElement | null = null;
  meterEl: HTMLElement | null = null;
  meterLabel: HTMLElement | null = null;
  meterBar: HTMLElement | null = null;
  meterFill: HTMLElement | null = null;
  chatLabel: HTMLElement | null = null;
  modelState: { providerId: string; models: ListedModel[] } | { providerId: string; error: string } | null = null;
  modelLoading = "";
  chatEl: HTMLSelectElement | null = null;
  chatSignature = "";
  modeEl: HTMLSelectElement | null = null;
  noteEl: HTMLElement | null = null;
  logRender: Component | null = null;
  logPaint = 0;

  constructor(leaf: WorkspaceLeaf, plugin: AgentPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW;
  }

  getDisplayText() {
    return "Агент";
  }

  getIcon() {
    return "bot";
  }

  async onOpen() {
    this.plugin.view = this;
    const root = this.contentEl;
    root.empty();
    root.addClass("agent-root");
    this.noteEl = root.createDiv({ cls: "agent-note" });
    this.logEl = root.createDiv({ cls: "agent-log" });
    const chatRow = root.createDiv({ cls: "agent-chatbar" });
    const chatPicker = chatRow.createDiv({ cls: "agent-chat-picker" });
    this.chatLabel = chatPicker.createSpan({ cls: "agent-chat-label" });
    chatPicker.createDiv({ cls: "agent-picker-mark", attr: { "aria-hidden": "true" } });
    this.chatEl = chatPicker.createEl("select", { cls: "agent-chat-select", attr: { "aria-label": "чат" } });
    this.chatEl.addEventListener("change", () => {
      const value = this.chatEl?.value ?? "";
      if (!value) return;
      void this.plugin.openSession(value);
    });
    const chatActions = chatRow.createDiv({ cls: "agent-chat-actions" });
    iconButton(chatActions, "plus", "новый чат").addEventListener("click", () => void this.plugin.newChat());
    iconButton(chatActions, "trash", "убрать чат").addEventListener("click", () => void this.plugin.deleteSession());
    const composer = root.createDiv({ cls: "agent-composer" });
    const context = composer.createDiv({ cls: "agent-context" });
    iconButton(context, "at-sign", "текущий файл").addEventListener("click", () => void this.plugin.focusOpenNote());
    this.chipEl = context.createDiv({ cls: "agent-chip" });
    this.chipLabel = this.chipEl.createSpan();
    const closeChip = iconButton(this.chipEl, "x", "убрать файл");
    closeChip.addEventListener("click", () => void this.plugin.setFocus("", false));
    this.meterEl = context.createDiv({ cls: "agent-meter" });
    this.meterEl.hidden = true;
    this.meterLabel = this.meterEl.createSpan({ cls: "agent-meter-label" });
    this.meterBar = this.meterEl.createDiv({ cls: "agent-meter-bar" });
    this.meterFill = this.meterBar.createSpan({ cls: "agent-meter-fill" });
    this.inputEl = composer.createEl("textarea", { attr: { rows: "3", placeholder: "Задание для заметки в фокусе" } });
    this.inputEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      if (this.plugin.running) return;
      event.preventDefault();
      this.onSend();
    });
    const bar = composer.createDiv({ cls: "agent-composer-bar" });
    const modeEl = picker(bar);
    this.modeEl = modeEl;
    modeEl.parentElement?.classList.add("agent-mode");
    modeEl.ariaLabel = "режим";
    for (const mode of AGENT_MODES) {
      modeEl.createEl("option", { value: mode, text: mode });
    }
    modeEl.addEventListener("change", () => {
      const value = modeEl.value;
      if (!isAgentMode(value)) return;
      this.plugin.settings.mode = value;
      void this.plugin.saveSettings();
      this.syncMode();
    });
    const modelWrap = bar.createDiv({ cls: "agent-model" });
    this.modelTrigger = modelWrap.createDiv({ cls: "agent-picker agent-model-trigger", attr: { role: "button", tabindex: "0" } });
    this.modelLabel = this.modelTrigger.createSpan({ cls: "agent-model-current" });
    this.modelTrigger.createDiv({ cls: "agent-picker-mark", attr: { "aria-hidden": "true" } });
    this.modelTrigger.addEventListener("click", () => {
      this.modelOpen = !this.modelOpen;
      this.syncModelSelect();
    });
    this.modelTrigger.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this.modelTrigger?.click();
    });
    this.modelMenu = composer.createDiv({ cls: "agent-model-menu", attr: { role: "listbox" } });
    this.modelMenu.hidden = true;
    document.addEventListener("pointerdown", this.closeModelMenu);
    this.providerEl = picker(bar);
    this.providerEl.addEventListener("change", () => {
      if (!this.providerEl) return;
      this.plugin.settings.activeId = this.providerEl.value;
      this.modelState = null;
      this.modelOpen = false;
      void this.plugin.saveSettings();
      this.syncModelSelect();
      void this.loadChatModels();
    });
    this.sendEl = iconButton(root, "arrow-up", "отправить");
    this.sendEl.classList.add("agent-send");
    this.sendEl.addEventListener("click", () => this.onSend());
    this.paint();
  }

  async onClose() {
    this.clearLogRender();
    document.removeEventListener("pointerdown", this.closeModelMenu);
    if (this.plugin.view === this) this.plugin.view = null;
  }

  private readonly closeModelMenu = (event: PointerEvent) => {
    if (!this.modelOpen) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (this.modelMenu?.contains(target) || this.modelTrigger?.contains(target)) return;
    this.modelOpen = false;
    this.syncModelSelect();
  };

  paint() {
    if (!this.logEl || !this.sendEl) return;
    if (this.plugin.focusFollow) {
      const path = this.plugin.openNotePath();
      if (path && path !== this.plugin.focusPath) {
        this.plugin.focusPath = path;
        void this.plugin.saveSettings();
      }
    }
    this.syncProviderSelect();
    this.syncModelSelect();
    this.syncMode();
    this.syncChip();
    this.syncMeter();
    this.syncChatSelect();
    const provider = this.plugin.activeProvider();
    const listed = this.modelState?.providerId === provider?.id;
    if (provider && providerCanList(provider) && !listed && this.modelLoading !== provider.id) void this.loadChatModels();
    const session = this.plugin.activeSession();
    if (this.noteEl) {
      this.noteEl.hidden = !session?.imagesOmitted;
      this.noteEl.setText(session?.imagesOmitted ? "картинки этого чата не сохранены, модель их не видит" : "");
    }
    this.clearLogRender();
    this.logEl.empty();
    const paintId = ++this.logPaint;
    const pending: Promise<void>[] = [];
    if (session) {
      for (const line of session.lines) {
        const rendered = this.appendLine(this.logEl, line, paintId);
        if (rendered) pending.push(rendered);
      }
    }
    if (this.plugin.running) this.logEl.createDiv({ cls: "agent-spin", attr: { "aria-label": "агент работает" } });
    this.logEl.scrollTop = this.logEl.scrollHeight;
    if (pending.length > 0) {
      void Promise.all(pending).then(() => {
        if (paintId !== this.logPaint || !this.logEl) return;
        this.logEl.scrollTop = this.logEl.scrollHeight;
      });
    }
    const sending = this.plugin.running;
    const sendLabel = sending ? "стоп" : "отправить";
    setIcon(this.sendEl, sending ? "square" : "arrow-up");
    this.sendEl.ariaLabel = sendLabel;
    setTooltip(this.sendEl, sendLabel);
  }

  private clearLogRender() {
    if (!this.logRender) return;
    this.removeChild(this.logRender);
    this.logRender = null;
  }

  private appendLine(parent: HTMLElement, line: ChatLine, paintId: number): Promise<void> | null {
    const entry = parent.createDiv({ cls: "agent-entry" });
    if (line.kind === "assistant" && line.text) {
      const body = entry.createDiv({ cls: "agent-line agent-assistant markdown-rendered" });
      const rendered = this.renderAssistant(body, line.text, paintId);
      this.appendCopy(entry, line.text);
      return rendered;
    }
    entry.createDiv({ cls: "agent-line agent-" + line.kind, text: line.text });
    if (line.kind === "user" && line.text) this.appendCopy(entry, line.text);
    return null;
  }

  private appendCopy(entry: HTMLElement, text: string) {
    const actions = entry.createDiv({ cls: "agent-actions" });
    iconButton(actions, "copy", "копировать").addEventListener("click", () => void copyLine(text));
  }

  private renderAssistant(body: HTMLElement, text: string, paintId: number): Promise<void> {
    if (!this.logRender) this.logRender = this.addChild(new Component());
    const render = this.logRender;
    return Promise.resolve()
      .then(() => MarkdownRenderer.render(this.app, text, body, this.plugin.focusPath, render))
      .then(
        () => undefined,
        () => {
          if (paintId !== this.logPaint || !body.isConnected) return;
          body.classList.remove("markdown-rendered");
          body.empty();
          body.setText(text);
        },
      );
  }

  private onSend() {
    if (this.plugin.running) {
      this.plugin.stop = true;
      return;
    }
    const text = this.inputEl?.value.trim() ?? "";
    if (!text) return;
    if (this.inputEl) this.inputEl.value = "";
    void this.plugin.ask(text);
  }

  private syncMode() {
    const select = this.modeEl;
    if (!select) return;
    const mode = this.plugin.settings.mode;
    if (select.value !== mode) select.value = mode;
    const hint = MODE_HINT[mode];
    select.ariaLabel = "режим " + mode + ", " + hint;
    if (select.parentElement) setTooltip(select.parentElement, hint);
    if (this.inputEl) this.inputEl.placeholder = mode === "chat" ? "Вопрос" : "Задание для заметки в фокусе";
  }

  private syncProviderSelect() {
    const select = this.providerEl;
    if (!select) return;
    const providers = this.plugin.settings.providers;
    const signature = providers.map((item) => item.id + "\0" + item.name + "\0" + item.base).join("\n");
    if (this.providerSignature !== signature) {
      while (select.options.length > 0) select.remove(0);
      const known = providers.some((item) => item.id === this.plugin.settings.activeId);
      if (!known) select.add(new Option(providers.length === 0 ? "нет провайдера" : "выбери провайдера", ""));
      for (const item of providers) select.add(new Option(providerLabel(item), item.id));
      this.providerSignature = signature;
    }
    const hideProvider = providers.length < 2;
    select.hidden = hideProvider;
    if (select.parentElement) select.parentElement.hidden = hideProvider;
    const wanted = providers.some((item) => item.id === this.plugin.settings.activeId) ? this.plugin.settings.activeId : "";
    if (select.value !== wanted) select.value = wanted;
  }

  private syncChip() {
    if (!this.chipEl || !this.chipLabel) return;
    const focus = this.plugin.focusPath.trim();
    this.chipEl.hidden = !focus;
    if (!focus) return;
    const name = focus.split("/").pop() || focus;
    const current = this.plugin.openNotePath() === focus ? " · текущий" : "";
    this.chipLabel.setText(name + current);
  }

  private syncMeter() {
    const meter = this.meterEl;
    const label = this.meterLabel;
    const bar = this.meterBar;
    const fill = this.meterFill;
    if (!meter || !label || !bar || !fill) return;
    const used = this.plugin.activeSession()?.contextUsed ?? null;
    if (used === null) {
      meter.hidden = true;
      return;
    }
    const limit = this.contextLimit();
    meter.hidden = false;
    label.setText(contextLabel(used, limit));
    if (limit === null) {
      bar.hidden = true;
      meter.removeClass("is-over");
      const tip = "контекст " + used + ", окно модели провайдер не прислал";
      meter.ariaLabel = tip;
      setTooltip(meter, tip);
      return;
    }
    bar.hidden = false;
    const over = used > limit;
    meter.toggleClass("is-over", over);
    fill.style.width = Math.min(100, (used / limit) * 100) + "%";
    const tip = "контекст " + used + " из " + limit + ", " + Math.round((used / limit) * 100) + "%";
    meter.ariaLabel = tip;
    setTooltip(meter, tip);
  }

  private contextLimit(): number | null {
    const provider = this.plugin.activeProvider();
    const state = this.modelState;
    if (!provider || !state || state.providerId !== provider.id || !("models" in state)) return null;
    const id = provider.model.trim();
    if (!id) return null;
    const model = state.models.find((item) => item.id === id);
    if (!model) return null;
    return model.context;
  }

  private syncChatSelect() {
    const select = this.chatEl;
    if (!select) return;
    const sessions = this.plugin.sessions;
    const signature = sessions.map((item) => item.id + "\0" + item.title + "\0" + item.lines.length).join("\n");
    if (this.chatSignature !== signature) {
      while (select.options.length > 0) select.remove(0);
      const known = sessions.some((item) => item.id === this.plugin.sessionId);
      if (!known) select.add(new Option(sessions.length === 0 ? "нет чата" : "выбери чат", ""));
      for (const item of sessions) select.add(new Option(item.lines.length === 0 ? "чат" : item.title || item.id, item.id));
      this.chatSignature = signature;
    }
    const wanted = sessions.some((item) => item.id === this.plugin.sessionId) ? this.plugin.sessionId : "";
    if (select.value !== wanted) select.value = wanted;
    const selected = Array.from(select.options).find((option) => option.value === select.value);
    this.chatLabel?.setText(selected?.text ?? "");
  }

  private chooseModel(id: string) {
    const provider = this.plugin.activeProvider();
    if (!provider || !id) return;
    provider.model = id;
    this.modelOpen = false;
    void this.plugin.saveSettings();
    this.syncModelSelect();
  }

  private syncModelSelect() {
    const menu = this.modelMenu;
    const label = this.modelLabel;
    if (!menu || !label || !this.modelTrigger) return;
    const provider = this.plugin.activeProvider();
    const models = provider && this.modelState?.providerId === provider.id && "models" in this.modelState ? this.modelState.models : [];
    const current = provider?.model.trim() ?? "";
    const placeholder = !provider ? "нет модели" : !current && models.length === 0 ? "нет списка моделей" : !current ? "модель" : "";
    const signature = (provider?.id ?? "") + "\0" + placeholder + "\0" + current + "\0" + models.map(modelKey).join("\n");
    const shown = current || placeholder;
    const selected = models.find((model) => model.id === current);
    const notes = selected ? modelNotes(selected) : "";
    label.setText(shown);
    const caption = notes ? shown + ", " + notes.split(" · ").join(", ") : shown;
    this.modelTrigger.ariaLabel = caption;
    setTooltip(this.modelTrigger, caption);
    if (this.modelSignature !== signature) {
      menu.empty();
      const rows = current && !models.some((model) => model.id === current) ? [{ id: current, pay: null, images: null, context: null }, ...models] : models;
      if (rows.length === 0 && placeholder) menu.createDiv({ cls: "agent-model-row", text: placeholder });
      for (const model of rows) {
        const row = menu.createDiv({ cls: "agent-model-row", attr: { role: "option" } });
        if (model.id === current) row.addClass("is-active");
        row.createSpan({ cls: "agent-model-id", text: model.id });
        const mark = modelNotes(model);
        if (mark) row.createSpan({ cls: "agent-model-note", text: mark });
        row.addEventListener("click", () => this.chooseModel(model.id));
      }
      this.modelSignature = signature;
    }
    menu.hidden = !this.modelOpen;
    this.modelTrigger.ariaExpanded = this.modelOpen ? "true" : "false";
  }

  private async loadChatModels() {
    const provider = this.plugin.activeProvider();
    if (!provider || !providerCanList(provider)) {
      this.modelState = null;
      this.syncModelSelect();
      return;
    }
    const id = provider.id;
    if (this.modelLoading === id) return;
    this.modelLoading = id;
    try {
      const models = await this.plugin.fetchModels(provider);
      if (this.modelLoading !== id) return;
      this.modelState = { providerId: id, models };
    } catch (err) {
      if (this.modelLoading !== id) return;
      const message = err instanceof Error ? err.message : String(err);
      this.modelState = { providerId: id, error: message };
      this.plugin.push({ kind: "error", text: message });
    } finally {
      if (this.modelLoading === id) this.modelLoading = "";
      this.syncModelSelect();
    }
  }
}

class AgentSettingTab extends PluginSettingTab {
  plugin: AgentPlugin;

  constructor(app: App, plugin: AgentPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const providers = this.plugin.settings.providers;
    const active = this.plugin.activeProvider();
    new Setting(containerEl)
      .setName("Провайдер")
      .addDropdown((menu) => {
        if (!active) menu.addOption("", providers.length ? "выбери провайдера" : "нет провайдера");
        for (const item of providers) menu.addOption(item.id, item.name || item.id);
        menu.setValue(active?.id ?? "").onChange(async (value) => {
          this.plugin.settings.activeId = value;
          await this.plugin.saveSettings();
          this.plugin.paint();
          this.display();
        });
      })
      .addButton((button) => button.setButtonText("убрать").onClick(() => this.removeProvider()));
    let picked = "";
    new Setting(containerEl)
      .setName("Добавить провайдера")
      .setDesc("Адрес известных сервисов подставится сам. Свой — пустой адрес и ключ. Локальная — адрес сервера в сети, модель на iPad не запускается.")
      .addDropdown((menu) => {
        menu.addOption("", "выбери");
        for (const preset of PROVIDER_PRESETS) menu.addOption(preset.id, preset.name);
        menu.onChange((value) => {
          picked = value;
        });
      })
      .addButton((button) => button.setButtonText("добавить").onClick(() => {
        if (!picked) {
          new Notice("выбери преднастройку");
          return;
        }
        void this.addProvider(picked);
      }));
    if (!active) {
      new Setting(containerEl).setDesc(providers.length ? "выбери провайдера" : "добавь провайдера");
    } else {
      this.providerFields(containerEl, active);
    }
    new Setting(containerEl)
      .setName("Шагов за ответ")
      .addText((text) => text.setValue(String(this.plugin.settings.maxSteps)).onChange(async (value) => {
        const steps = Number(value);
        if (!Number.isInteger(steps) || steps < 1 || steps > MAX_STEPS) {
          new Notice("шаги: целое от 1 до " + MAX_STEPS);
          return;
        }
        this.plugin.settings.maxSteps = steps;
        await this.plugin.saveSettings();
      }));
  }

  private providerFields(containerEl: HTMLElement, provider: Provider) {
    new Setting(containerEl)
      .setName("Имя")
      .addText((text) => text.setValue(provider.name).onChange(async (value) => {
        provider.name = value.trim();
        await this.plugin.saveSettings();
        this.plugin.paint();
      }));
    const preset = provider.preset ? presetById(provider.preset) : undefined;
    new Setting(containerEl)
      .setName("Адрес API")
      .setDesc(preset?.hint ?? "OpenAI-совместимый адрес, без /chat/completions")
      .addText((text) => text.setPlaceholder(preset?.id === "local" ? "http://192.168.1.10:11434/v1" : "https://api.openai.com/v1").setValue(provider.base).onChange(async (value) => {
        assignProviderBase(provider, value);
        await this.plugin.saveSettings();
      }));
    const keySetting = new Setting(containerEl).setName("Ключ");
    if (!providerNeedsKey(provider)) keySetting.setDesc("можно оставить пустым");
    keySetting.addText((text) => {
        text.inputEl.type = "password";
        text.setValue(provider.key).onChange(async (value) => {
          provider.key = value;
          await this.plugin.saveSettings();
        });
      });
    const modelSetting = new Setting(containerEl).setName("Модель").setDesc("загружаю список…");
    let dropdown: DropdownComponent | null = null;
    modelSetting.addDropdown((menu) => {
      dropdown = menu;
      const current = provider.model.trim();
      if (current) menu.addOption(current, current);
      menu.setValue(current).onChange(async (value) => {
        if (!value.trim()) return;
        provider.model = value.trim();
        await this.plugin.saveSettings();
        this.plugin.paint();
      });
    });
    modelSetting.addButton((button) => button.setButtonText("обновить").onClick(() => {
      if (!dropdown) return;
      void this.fillModels(modelSetting, dropdown, provider);
    }));
    if (dropdown) void this.fillModels(modelSetting, dropdown, provider);
    new Setting(containerEl)
      .setName("Таймаут, секунды")
      .setDesc("Сколько секунд ждать следующие данные. Пусто — предел Obsidian: на iPad молчание дольше минуты обрывает запрос. Для локальной модели поставь несколько минут.")
      .addText((text) => text.setPlaceholder("секунды").setValue(provider.timeout === undefined ? "" : String(provider.timeout)).onChange(async (value) => {
        const raw = value.trim();
        if (raw === "") {
          delete provider.timeout;
          await this.plugin.saveSettings();
          return;
        }
        const timeout = Number(raw);
        if (!Number.isInteger(timeout) || timeout < 1 || timeout > 3600) {
          new Notice("таймаут: целое число секунд от 1 до 3600");
          return;
        }
        provider.timeout = timeout;
        await this.plugin.saveSettings();
      }));
  }

  private async addProvider(presetId: string) {
    const preset = presetById(presetId);
    if (!preset) {
      new Notice("нет такой преднастройки");
      return;
    }
    const provider = providerFromPreset(preset, newProviderId());
    this.plugin.settings.providers.push(provider);
    this.plugin.settings.activeId = provider.id;
    await this.plugin.saveSettings();
    this.plugin.paint();
    this.display();
  }

  private async removeProvider() {
    const current = this.plugin.activeProvider();
    if (!current) {
      new Notice("выбери провайдера");
      return;
    }
    this.plugin.settings.providers = this.plugin.settings.providers.filter((item) => item.id !== current.id);
    this.plugin.settings.activeId = "";
    await this.plugin.saveSettings();
    this.plugin.paint();
    this.display();
  }

  private async fillModels(setting: Setting, dropdown: DropdownComponent, provider: Provider) {
    if (!providerCanList(provider)) {
      setting.setDesc(providerNeedsKey(provider) ? "укажи адрес API и ключ, затем нажми «обновить»" : "укажи адрес API, затем нажми «обновить»");
      return;
    }
    try {
      const models = await this.plugin.fetchModels(provider);
      if (this.plugin.settings.activeId !== provider.id) return;
      const current = provider.model.trim();
      dropdown.selectEl.length = 0;
      if (!current) dropdown.addOption("", "выбери модель");
      else if (!models.some((model) => model.id === current)) dropdown.addOption(current, current);
      for (const model of models) dropdown.addOption(model.id, modelMenuLabel(model));
      dropdown.setValue(current);
      const missing = current && !models.some((model) => model.id === current) ? " Текущей модели нет в списке провайдера." : "";
      const tagged = models.some((model) => model.pay !== null || model.images !== null);
      const about = tagged
        ? " В списке подписано, платная модель или нет и читает ли она картинки."
        : " Провайдер не прислал цену и поддержку картинок.";
      setting.setDesc(models.length + " моделей." + about + missing);
    } catch (err) {
      if (this.plugin.settings.activeId !== provider.id) return;
      const message = err instanceof Error ? err.message : String(err);
      setting.setDesc(message);
      new Notice(message);
    }
  }
}
