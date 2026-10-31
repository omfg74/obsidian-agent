import { ItemView, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, WorkspaceLeaf, requestUrl, type App, type DropdownComponent } from "obsidian";
import { TOOLS, runAgent, systemPrompt, type ChatMessage } from "./agent.ts";
import { modelIds } from "./models.ts";
import { dispatchTool, type VaultFs } from "./vault.ts";

const VIEW = "obsidian-agent";

interface AgentSettings {
  base: string;
  key: string;
  model: string;
  maxSteps: number;
}

const DEFAULT_SETTINGS: AgentSettings = {
  base: "https://api.openai.com/v1",
  key: "",
  model: "gpt-4o",
  maxSteps: 8,
};

type Line = { kind: "user" | "assistant" | "tool" | "error"; text: string };

export default class AgentPlugin extends Plugin {
  settings: AgentSettings = DEFAULT_SETTINGS;
  lines: Line[] = [];
  history: ChatMessage[] = [];
  running = false;
  stop = false;
  view: AgentView | null = null;

  async onload() {
    await this.loadSettings();
    this.registerView(VIEW, (leaf) => new AgentView(leaf, this));
    this.addRibbonIcon("bot", "Агент", () => this.activate());
    this.addCommand({ id: "open", name: "Открыть", callback: () => this.activate() });
    this.addSettingTab(new AgentSettingTab(this.app, this));
  }

  async loadSettings() {
    const saved = await this.loadData();
    if (!saved || typeof saved !== "object") return;
    const data = saved as Partial<AgentSettings>;
    if (typeof data.base === "string" && data.base.trim()) this.settings.base = data.base.trim();
    if (typeof data.key === "string") this.settings.key = data.key;
    if (typeof data.model === "string" && data.model.trim()) this.settings.model = data.model.trim();
    if (typeof data.maxSteps === "number" && Number.isInteger(data.maxSteps) && data.maxSteps >= 1) this.settings.maxSteps = data.maxSteps;
  }

  async saveSettings() {
    await this.saveData(this.settings);
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

  clear() {
    if (this.running) {
      this.push({ kind: "error", text: "сначала останови текущий запрос" });
      return;
    }
    this.lines = [];
    this.history = [];
    this.paint();
  }

  push(line: Line) {
    this.lines.push(line);
    this.paint();
  }

  async ask(task: string) {
    if (this.running) return;
    const key = this.settings.key.trim();
    const model = this.settings.model.trim();
    const base = this.settings.base.trim().replace(/\/$/, "");
    if (!key) {
      this.push({ kind: "error", text: "укажи ключ в настройках плагина" });
      return;
    }
    if (!model || !base) {
      this.push({ kind: "error", text: "укажи адрес API и модель" });
      return;
    }
    const active = this.activePath();
    const selected = this.selection();
    const prompt = [selected ? "Выделение:\n" + selected : "", "Задание:\n" + task].filter(Boolean).join("\n\n");
    this.history.push({ role: "user", content: prompt });
    this.push({ kind: "user", text: task });
    this.running = true;
    this.stop = false;
    this.paint();
    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt(active) }, ...this.history.filter((item) => item.role !== "system")];
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
      this.history = messages.filter((item) => item.role !== "system");
      this.running = false;
      this.stop = false;
      this.paint();
    }
  }

  private activePath(): string {
    return this.app.workspace.getActiveViewOfType(MarkdownView)?.file?.path ?? "";
  }

  private selection(): string {
    return this.app.workspace.getActiveViewOfType(MarkdownView)?.editor.getSelection() ?? "";
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
          const view = app.workspace.getActiveViewOfType(MarkdownView);
          if (view?.file?.path === path) {
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

class AgentView extends ItemView {
  plugin: AgentPlugin;
  logEl: HTMLElement | null = null;
  inputEl: HTMLTextAreaElement | null = null;
  sendEl: HTMLButtonElement | null = null;

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
    this.logEl = root.createDiv({ cls: "agent-log" });
    this.inputEl = root.createEl("textarea", { attr: { rows: "4", placeholder: "Что сделать с заметкой" } });
    const row = root.createDiv({ cls: "agent-row" });
    this.sendEl = row.createEl("button", { text: "отправить" });
    this.sendEl.addEventListener("click", () => this.onSend());
    const clear = row.createEl("button", { text: "очистить" });
    clear.addEventListener("click", () => this.plugin.clear());
    this.paint();
  }

  async onClose() {
    if (this.plugin.view === this) this.plugin.view = null;
  }

  paint() {
    if (!this.logEl || !this.sendEl) return;
    this.logEl.empty();
    for (const line of this.plugin.lines) {
      this.logEl.createDiv({ cls: "agent-line agent-" + line.kind, text: line.text });
    }
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
    new Setting(containerEl)
      .setName("Адрес API")
      .setDesc("OpenAI-совместимый адрес, без /chat/completions")
      .addText((text) => text.setPlaceholder(DEFAULT_SETTINGS.base).setValue(this.plugin.settings.base).onChange(async (value) => {
        this.plugin.settings.base = value.trim();
        await this.plugin.saveSettings();
      }));
    new Setting(containerEl)
      .setName("Ключ")
      .addText((text) => {
        text.inputEl.type = "password";
        text.setValue(this.plugin.settings.key).onChange(async (value) => {
          this.plugin.settings.key = value;
          await this.plugin.saveSettings();
        });
      });
    const modelSetting = new Setting(containerEl).setName("Модель").setDesc("загружаю список…");
    let dropdown: DropdownComponent | null = null;
    modelSetting.addDropdown((menu) => {
      dropdown = menu;
      const current = this.plugin.settings.model.trim();
      if (current) menu.addOption(current, current);
      menu.setValue(current).onChange(async (value) => {
        if (!value.trim()) return;
        this.plugin.settings.model = value.trim();
        await this.plugin.saveSettings();
      });
    });
    modelSetting.addButton((button) => button.setButtonText("обновить").onClick(() => {
      if (!dropdown) return;
      void this.fillModels(modelSetting, dropdown);
    }));
    if (dropdown) void this.fillModels(modelSetting, dropdown);
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

  private async fillModels(setting: Setting, dropdown: DropdownComponent) {
    const base = this.plugin.settings.base.trim().replace(/\/$/, "");
    const key = this.plugin.settings.key.trim();
    if (!base || !key) {
      setting.setDesc("укажи адрес API и ключ, затем нажми «обновить»");
      return;
    }
    try {
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
      const ids = modelIds(res.json);
      const current = this.plugin.settings.model.trim();
      dropdown.selectEl.length = 0;
      if (!current) dropdown.addOption("", "выбери модель");
      else if (!ids.includes(current)) dropdown.addOption(current, current);
      for (const id of ids) dropdown.addOption(id, id);
      dropdown.setValue(current);
      const missing = current && !ids.includes(current) ? " Текущей модели нет в списке провайдера." : "";
      setting.setDesc(ids.length + " моделей. Нужны инструменты и картинки." + missing);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setting.setDesc(message);
      new Notice(message);
    }
  }
}
