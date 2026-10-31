import { ItemView, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, WorkspaceLeaf, requestUrl, type App, type DropdownComponent } from "obsidian";
import { TOOLS, runAgent, systemPrompt, type ChatMessage } from "./agent.ts";
import { newSession, sessionTitle, sessionsFromSaved, stripImages, type ChatLine, type Session } from "./chats.ts";
import { modelIds } from "./models.ts";
import { freshSettings, newProviderId, settingsFromSaved, type AgentSettings, type Provider } from "./settings.ts";
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
    if (!this.focusFollow || this.focusPath === view.file.path) return;
    this.focusPath = view.file.path;
    void this.saveSettings();
    this.paint();
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
    if (current && current.lines.length === 0 && current.history.length === 0) return;
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

  async fetchModelIds(provider: Provider): Promise<string[]> {
    const base = provider.base.trim().replace(/\/$/, "");
    const key = provider.key.trim();
    if (!base || !key) throw new Error("укажи адрес API и ключ");
    const res = await requestUrl({
      url: base + "/models",
      method: "GET",
      headers: { Authorization: "Bearer " + key },
      throw: false,
    });
    if (res.status < 200 || res.status >= 300) {
      const body = (res.text || "").slice(0, 500);
      throw new Error("список моделей ответил " + res.status + (body ? ": " + body : ""));
    }
    return modelIds(res.json);
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
    const key = provider.key.trim();
    const model = provider.model.trim();
    const base = provider.base.trim().replace(/\/$/, "");
    if (!key) {
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
    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt(active) }, ...session.history.filter((item) => item.role !== "system")];
    try {
      await runAgent({
        messages,
        maxSteps: this.settings.maxSteps,
        shouldStop: () => this.stop,
        onLine: (line) => this.push({ kind: "tool", text: line }),
        post: (batch) => this.post(base, key, model, batch),
        callTool: (name, args) => dispatchTool(this.vaultFs(), name, args),
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

  private async post(base: string, key: string, model: string, messages: ChatMessage[]) {
    const res = await requestUrl({
      url: base + "/chat/completions",
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, tools: TOOLS }),
      throw: false,
    });
    if (res.status < 200 || res.status >= 300) {
      const body = (res.text || "").slice(0, 500);
      throw new Error("модель ответила " + res.status + (body ? ": " + body : ""));
    }
    const data = res.json as { choices?: { message?: { content?: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] } }[] };
    const message = data.choices?.[0]?.message;
    if (!message) throw new Error("в ответе нет сообщения");
    return { content: message.content ?? null, tool_calls: message.tool_calls };
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
        return app.vault.read(file);
      },
      async write(path, content) {
        const file = app.vault.getAbstractFileByPath(path);
        if (file instanceof TFolder) throw new Error("это папка");
        if (file instanceof TFile) {
          const view = app.workspace.getLeavesOfType("markdown").map((leaf) => leaf.view).find((item): item is MarkdownView => item instanceof MarkdownView && item.file?.path === path);
          if (view) {
            view.editor.setValue(content);
            return;
          }
          await app.vault.modify(file, content);
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
    };
  }
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
  sendEl: HTMLButtonElement | null = null;
  providerEl: HTMLSelectElement | null = null;
  providerSignature = "";
  modelEl: HTMLSelectElement | null = null;
  modelSignature = "";
  focusEl: HTMLSelectElement | null = null;
  focusSignature = "";
  modelState: { providerId: string; ids: string[] } | { providerId: string; error: string } | null = null;
  modelLoading = "";
  chatEl: HTMLSelectElement | null = null;
  chatSignature = "";
  noteEl: HTMLElement | null = null;

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
    this.providerEl = root.createEl("select", { cls: "agent-provider" });
    this.providerEl.addEventListener("change", () => {
      if (!this.providerEl) return;
      this.plugin.settings.activeId = this.providerEl.value;
      this.modelState = null;
      void this.plugin.saveSettings();
      this.syncModelSelect();
      void this.loadChatModels();
    });
    this.modelEl = root.createEl("select", { cls: "agent-provider" });
    this.modelEl.addEventListener("change", () => {
      const provider = this.plugin.activeProvider();
      const value = this.modelEl?.value.trim() ?? "";
      if (!provider || !value) return;
      provider.model = value;
      void this.plugin.saveSettings();
    });
    const focusRow = root.createDiv({ cls: "agent-focus-row" });
    this.focusEl = focusRow.createEl("select");
    this.focusEl.addEventListener("change", () => {
      const value = this.focusEl?.value ?? "";
      if (!value) return;
      void this.plugin.setFocus(value, false);
    });
    focusRow.createEl("button", { text: "открытая" }).addEventListener("click", () => void this.plugin.focusOpenNote());
    this.chatEl = root.createEl("select", { cls: "agent-provider" });
    this.chatEl.addEventListener("change", () => {
      const value = this.chatEl?.value ?? "";
      if (!value) return;
      void this.plugin.openSession(value);
    });
    const chatRow = root.createDiv({ cls: "agent-row" });
    chatRow.createEl("button", { text: "новый чат" }).addEventListener("click", () => void this.plugin.newChat());
    chatRow.createEl("button", { text: "убрать" }).addEventListener("click", () => void this.plugin.deleteSession());
    this.noteEl = root.createDiv({ cls: "agent-tool" });
    this.logEl = root.createDiv({ cls: "agent-log" });
    this.inputEl = root.createEl("textarea", { attr: { rows: "4", placeholder: "Что сделать с заметкой" } });
    const row = root.createDiv({ cls: "agent-row" });
    this.sendEl = row.createEl("button", { text: "отправить" });
    this.sendEl.addEventListener("click", () => this.onSend());
    this.paint();
  }

  async onClose() {
    if (this.plugin.view === this) this.plugin.view = null;
  }

  paint() {
    if (!this.logEl || !this.sendEl) return;
    this.syncProviderSelect();
    this.syncModelSelect();
    this.syncFocusSelect();
    this.syncChatSelect();
    const provider = this.plugin.activeProvider();
    const listed = this.modelState?.providerId === provider?.id;
    if (provider?.base.trim() && provider.key.trim() && !listed && this.modelLoading !== provider.id) void this.loadChatModels();
    const session = this.plugin.activeSession();
    if (this.noteEl) {
      this.noteEl.hidden = !session?.imagesOmitted;
      this.noteEl.setText(session?.imagesOmitted ? "картинки этого чата не сохранены, модель их не видит" : "");
    }
    this.logEl.empty();
    if (session) {
      for (const line of session.lines) {
        const entry = this.logEl.createDiv({ cls: "agent-entry" });
        entry.createDiv({ cls: "agent-line agent-" + line.kind, text: line.text });
        if ((line.kind === "user" || line.kind === "assistant") && line.text) {
          const copy = entry.createEl("button", { text: "копировать" });
          copy.addEventListener("click", () => void copyLine(line.text));
        }
      }
    }
    if (this.plugin.running) this.logEl.createDiv({ cls: "agent-spin", attr: { "aria-label": "агент работает" } });
    this.logEl.scrollTop = this.logEl.scrollHeight;
    this.sendEl.setText(this.plugin.running ? "стоп" : "отправить");
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

  private syncProviderSelect() {
    const select = this.providerEl;
    if (!select) return;
    const providers = this.plugin.settings.providers;
    const signature = providers.map((item) => item.id + "\0" + item.name).join("\n");
    if (this.providerSignature !== signature) {
      while (select.options.length > 0) select.remove(0);
      const known = providers.some((item) => item.id === this.plugin.settings.activeId);
      if (!known) select.add(new Option(providers.length === 0 ? "нет провайдера" : "выбери провайдера", ""));
      for (const item of providers) select.add(new Option(item.name || item.id, item.id));
      this.providerSignature = signature;
    }
    const wanted = providers.some((item) => item.id === this.plugin.settings.activeId) ? this.plugin.settings.activeId : "";
    if (select.value !== wanted) select.value = wanted;
  }

  private syncFocusSelect() {
    const select = this.focusEl;
    if (!select) return;
    const notes = this.plugin.app.vault.getMarkdownFiles().map((file) => file.path).sort((a, b) => a.localeCompare(b));
    const focus = this.plugin.focusPath.trim();
    if (focus && !notes.includes(focus)) notes.unshift(focus);
    const signature = focus + "\0" + notes.join("\n");
    if (this.focusSignature !== signature) {
      while (select.options.length > 0) select.remove(0);
      if (!focus) select.add(new Option("выбери файл", ""));
      for (const path of notes) select.add(new Option(path, path));
      this.focusSignature = signature;
    }
    const wanted = focus && Array.from(select.options).some((option) => option.value === focus) ? focus : "";
    if (select.value !== wanted) select.value = wanted;
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
  }

  private syncModelSelect() {
    const select = this.modelEl;
    if (!select) return;
    const provider = this.plugin.activeProvider();
    const ids = provider && this.modelState?.providerId === provider.id && "ids" in this.modelState ? this.modelState.ids : [];
    const current = provider?.model.trim() ?? "";
    const placeholder = !provider ? "выбери провайдера" : !current && ids.length === 0 ? "нет списка моделей" : !current ? "выбери модель" : "";
    const signature = (provider?.id ?? "") + "\0" + placeholder + "\0" + current + "\0" + ids.join("\n");
    if (this.modelSignature !== signature) {
      while (select.options.length > 0) select.remove(0);
      if (placeholder) select.add(new Option(placeholder, ""));
      if (current && !ids.includes(current)) select.add(new Option(current, current));
      for (const id of ids) select.add(new Option(id, id));
      this.modelSignature = signature;
    }
    const wanted = current && Array.from(select.options).some((option) => option.value === current) ? current : "";
    if (select.value !== wanted) select.value = wanted;
  }

  private async loadChatModels() {
    const provider = this.plugin.activeProvider();
    if (!provider || !provider.base.trim() || !provider.key.trim()) {
      this.modelState = null;
      this.syncModelSelect();
      return;
    }
    const id = provider.id;
    if (this.modelLoading === id) return;
    this.modelLoading = id;
    try {
      const ids = await this.plugin.fetchModelIds(provider);
      if (this.modelLoading !== id) return;
      this.modelState = { providerId: id, ids };
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
      .addButton((button) => button.setButtonText("добавить").onClick(() => this.addProvider()))
      .addButton((button) => button.setButtonText("убрать").onClick(() => this.removeProvider()));
    if (!active) {
      new Setting(containerEl).setDesc(providers.length ? "выбери провайдера" : "добавь провайдера");
    } else {
      this.providerFields(containerEl, active);
    }
    new Setting(containerEl)
      .setName("Шагов за ответ")
      .addText((text) => text.setValue(String(this.plugin.settings.maxSteps)).onChange(async (value) => {
        const steps = Number(value);
        if (!Number.isInteger(steps) || steps < 1 || steps > 30) {
          new Notice("шаги: целое от 1 до 30");
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
    new Setting(containerEl)
      .setName("Адрес API")
      .setDesc("OpenAI-совместимый адрес, без /chat/completions")
      .addText((text) => text.setPlaceholder("https://api.openai.com/v1").setValue(provider.base).onChange(async (value) => {
        provider.base = value.trim();
        await this.plugin.saveSettings();
      }));
    new Setting(containerEl)
      .setName("Ключ")
      .addText((text) => {
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
  }

  private async addProvider() {
    const provider: Provider = {
      id: newProviderId(),
      name: "провайдер " + (this.plugin.settings.providers.length + 1),
      base: "",
      key: "",
      model: "",
    };
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
    if (!provider.base.trim() || !provider.key.trim()) {
      setting.setDesc("укажи адрес API и ключ, затем нажми «обновить»");
      return;
    }
    try {
      const ids = await this.plugin.fetchModelIds(provider);
      if (this.plugin.settings.activeId !== provider.id) return;
      const current = provider.model.trim();
      dropdown.selectEl.length = 0;
      if (!current) dropdown.addOption("", "выбери модель");
      else if (!ids.includes(current)) dropdown.addOption(current, current);
      for (const id of ids) dropdown.addOption(id, id);
      dropdown.setValue(current);
      const missing = current && !ids.includes(current) ? " Текущей модели нет в списке провайдера." : "";
      setting.setDesc(ids.length + " моделей. Нужны инструменты и картинки." + missing);
    } catch (err) {
      if (this.plugin.settings.activeId !== provider.id) return;
      const message = err instanceof Error ? err.message : String(err);
      setting.setDesc(message);
      new Notice(message);
    }
  }
}
