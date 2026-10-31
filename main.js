"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AgentPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/agent.ts
var TOOLS = [
  {
    type: "function",
    function: {
      name: "read_note",
      description: "\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u0444\u0430\u0439\u043B \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "\u041F\u0443\u0442\u044C \u043E\u0442 \u043A\u043E\u0440\u043D\u044F \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430" } },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_folder",
      description: "\u0421\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432 \u0438 \u043F\u0430\u043F\u043E\u043A. \u041F\u0443\u0441\u0442\u043E\u0439 path \u2014 \u043A\u043E\u0440\u0435\u043D\u044C.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "view_image",
      description: "\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443 png, jpeg, gif \u0438\u043B\u0438 webp \u0438\u0437 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_replace",
      description: "\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u0434\u0438\u043D \u0442\u043E\u0447\u043D\u044B\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \u0432 \u0444\u0430\u0439\u043B\u0435. old \u0434\u043E\u043B\u0436\u0435\u043D \u0432\u0441\u0442\u0440\u0435\u0442\u0438\u0442\u044C\u0441\u044F \u0440\u043E\u0432\u043D\u043E \u043E\u0434\u0438\u043D \u0440\u0430\u0437.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          old: { type: "string" },
          new: { type: "string" }
        },
        required: ["path", "old", "new"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_note",
      description: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0444\u0430\u0439\u043B \u0446\u0435\u043B\u0438\u043A\u043E\u043C. \u0421\u043E\u0437\u0434\u0430\u0451\u0442, \u0435\u0441\u043B\u0438 \u0435\u0433\u043E \u043D\u0435 \u0431\u044B\u043B\u043E. \u0414\u043B\u044F \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0439 \u043F\u0440\u0430\u0432\u043A\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 search_replace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" }
        },
        required: ["path", "content"]
      }
    }
  }
];
function systemPrompt(activePath) {
  const where = activePath ? "\u041E\u0442\u043A\u0440\u044B\u0442\u0430 \u0437\u0430\u043C\u0435\u0442\u043A\u0430: " + activePath : "\u0417\u0430\u043C\u0435\u0442\u043A\u0430 \u043D\u0435 \u043E\u0442\u043A\u0440\u044B\u0442\u0430.";
  return [
    "\u0422\u044B \u0430\u0433\u0435\u043D\u0442 \u0432\u043D\u0443\u0442\u0440\u0438 Obsidian. \u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0441\u043C\u043E\u0442\u0440\u0438 \u0442\u043E\u043B\u044C\u043A\u043E \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438, \u043D\u0435 \u0432\u044B\u0434\u0443\u043C\u044B\u0432\u0430\u0439 \u0442\u0435\u043A\u0441\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0438 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A.",
    "\u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0443 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0442\u043A\u0440\u043E\u0439 \u0447\u0435\u0440\u0435\u0437 view_image. \u041C\u0430\u043B\u0435\u043D\u044C\u043A\u0443\u044E \u043F\u0440\u0430\u0432\u043A\u0443 \u0434\u0435\u043B\u0430\u0439 \u0447\u0435\u0440\u0435\u0437 search_replace.",
    "write_note \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442 \u0444\u0430\u0439\u043B \u0446\u0435\u043B\u0438\u043A\u043E\u043C.",
    where
  ].join("\n");
}
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("\u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u044B \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430 \u043D\u0435 \u043E\u0431\u044A\u0435\u043A\u0442");
  }
  return value;
}
async function runAgent(input) {
  var _a, _b, _c, _d, _e, _f, _g;
  const messages = input.messages;
  for (let step = 0; step < input.maxSteps; step++) {
    if ((_a = input.shouldStop) == null ? void 0 : _a.call(input)) throw new Error("\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
    const turn = await input.post(messages);
    const calls = (_b = turn.tool_calls) != null ? _b : [];
    if (calls.length === 0) {
      messages.push({ role: "assistant", content: (_c = turn.content) != null ? _c : "" });
      return messages;
    }
    messages.push({ role: "assistant", content: turn.content, tool_calls: calls });
    for (const call of calls) {
      if ((_d = input.shouldStop) == null ? void 0 : _d.call(input)) throw new Error("\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
      if (!call.id) throw new Error("\u043C\u043E\u0434\u0435\u043B\u044C \u043F\u0440\u0438\u0441\u043B\u0430\u043B\u0430 \u0432\u044B\u0437\u043E\u0432 \u0431\u0435\u0437 id");
      const name = ((_e = call.function) == null ? void 0 : _e.name) || "";
      (_f = input.onLine) == null ? void 0 : _f.call(input, "\u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442 " + name);
      let output;
      try {
        const args = asRecord(JSON.parse(((_g = call.function) == null ? void 0 : _g.arguments) || "{}"));
        output = await input.callTool(name, args);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output = { text: "\u043E\u0448\u0438\u0431\u043A\u0430: " + message };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: output.text });
      if (output.image) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: output.text },
            { type: "image_url", image_url: { url: "data:" + output.image.mime + ";base64," + output.image.base64 } }
          ]
        });
      }
    }
  }
  throw new Error("\u043B\u0438\u043C\u0438\u0442 \u0448\u0430\u0433\u043E\u0432: " + input.maxSteps);
}

// src/replace.ts
function replaceOnce(text, oldStr, newStr) {
  if (oldStr === "") throw new Error("\u043F\u0443\u0441\u0442\u043E\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \u0434\u043B\u044F \u0437\u0430\u043C\u0435\u043D\u044B");
  const first = text.indexOf(oldStr);
  if (first < 0) throw new Error("\u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
  const second = text.indexOf(oldStr, first + oldStr.length);
  if (second >= 0) throw new Error("\u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \u0432\u0441\u0442\u0440\u0435\u0447\u0430\u0435\u0442\u0441\u044F \u0431\u043E\u043B\u044C\u0448\u0435 \u043E\u0434\u043D\u043E\u0433\u043E \u0440\u0430\u0437\u0430");
  return text.slice(0, first) + newStr + text.slice(first + oldStr.length);
}

// src/vault.ts
var TEXT_LIMIT = 1e5;
var LIST_LIMIT = 200;
var IMAGE_LIMIT = 4 * 1024 * 1024;
var IMAGE_MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp"
};
function str(args, key) {
  const value = args[key];
  if (typeof value !== "string") throw new Error(key + " \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439");
  return value;
}
function imageMime(path) {
  var _a;
  const ext = ((_a = path.split(".").pop()) == null ? void 0 : _a.toLowerCase()) || "";
  const mime = IMAGE_MIME[ext];
  if (!mime) throw new Error("\u043C\u043E\u0434\u0435\u043B\u044C \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 png, jpeg, gif \u0438 webp");
  return mime;
}
function bytesToBase64(bytes) {
  let binary = "";
  const size = 32768;
  for (let i = 0; i < bytes.length; i += size) {
    binary += String.fromCharCode(...bytes.subarray(i, i + size));
  }
  return btoa(binary);
}
async function resolvePath(fs, raw) {
  const name = raw.trim().replace(/^\[\[/, "").replace(/\]\]$/, "").replace(/^\//, "");
  if (name.startsWith(".obsidian/") || name === ".obsidian") throw new Error("\u043F\u0430\u043F\u043A\u0443 .obsidian \u043D\u0435 \u0442\u0440\u043E\u0433\u0430\u044E");
  const exact = await fs.find(name);
  if (exact && !exact.folder) return exact.path;
  const withMd = name.endsWith(".md") ? null : await fs.find(name + ".md");
  if (withMd && !withMd.folder) return withMd.path;
  const hits = await fs.findMany(name);
  if (hits.length === 1) return hits[0];
  if (hits.length === 0) throw new Error("\u043D\u0435\u0442 \u0444\u0430\u0439\u043B\u0430 " + raw);
  throw new Error("\u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0444\u0430\u0439\u043B\u043E\u0432: " + hits.join(", "));
}
async function dispatchTool(fs, name, args) {
  if (name === "list_folder") {
    const path = str(args, "path").replace(/^\//, "").replace(/\/$/, "");
    if (path.startsWith(".obsidian/") || path === ".obsidian") throw new Error("\u043F\u0430\u043F\u043A\u0443 .obsidian \u043D\u0435 \u0447\u0438\u0442\u0430\u044E");
    const items = await fs.children(path);
    if (items.length > LIST_LIMIT) throw new Error("\u0432 \u043F\u0430\u043F\u043A\u0435 " + items.length + " \u0437\u0430\u043F\u0438\u0441\u0435\u0439, \u0443\u043A\u0430\u0436\u0438 \u0431\u043E\u043B\u0435\u0435 \u0443\u0437\u043A\u0438\u0439 \u043F\u0443\u0442\u044C");
    if (items.length === 0) return { text: path ? "\u043F\u0443\u0441\u0442\u043E: " + path : "\u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043F\u0443\u0441\u0442\u043E\u0435" };
    return { text: items.map((item) => item.folder ? item.path + "/" : item.path).join("\n") };
  }
  if (name === "read_note") {
    const path = await resolvePath(fs, str(args, "path"));
    const text = await fs.read(path);
    if (text.length > TEXT_LIMIT) throw new Error("\u0437\u0430\u043C\u0435\u0442\u043A\u0430 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u0430\u044F: " + text.length + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432");
    return { text };
  }
  if (name === "view_image") {
    const path = await resolvePath(fs, str(args, "path"));
    const mime = imageMime(path);
    const bytes = await fs.bytes(path);
    if (bytes.byteLength > IMAGE_LIMIT) throw new Error("\u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 4 \u041C\u0411");
    if (bytes.byteLength === 0) throw new Error("\u0444\u0430\u0439\u043B \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438 \u043F\u0443\u0441\u0442\u043E\u0439");
    return { text: "\u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 " + path, image: { mime, base64: bytesToBase64(bytes) } };
  }
  if (name === "search_replace") {
    const path = await resolvePath(fs, str(args, "path"));
    const text = await fs.read(path);
    const next = replaceOnce(text, str(args, "old"), str(args, "new"));
    await fs.write(path, next);
    return { text: "\u0437\u0430\u043C\u0435\u043D\u0438\u043B \u0432 " + path };
  }
  if (name === "write_note") {
    const raw = str(args, "path").trim().replace(/^\//, "");
    if (!raw || raw.startsWith(".obsidian/") || raw === ".obsidian") throw new Error("\u0442\u0430\u043A\u043E\u0439 \u043F\u0443\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F");
    const content = str(args, "content");
    await fs.write(raw, content);
    return { text: "\u0437\u0430\u043F\u0438\u0441\u0430\u043B " + raw + ", " + content.length + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432" };
  }
  throw new Error("\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442 " + name);
}

// src/main.ts
var VIEW = "obsidian-agent";
var DEFAULT_SETTINGS = {
  base: "https://api.openai.com/v1",
  key: "",
  model: "gpt-4o",
  maxSteps: 8
};
var AgentPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.lines = [];
    this.history = [];
    this.running = false;
    this.stop = false;
    this.view = null;
  }
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW, (leaf) => new AgentView(leaf, this));
    this.addRibbonIcon("bot", "\u0410\u0433\u0435\u043D\u0442", () => this.activate());
    this.addCommand({ id: "open", name: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C", callback: () => this.activate() });
    this.addSettingTab(new AgentSettingTab(this.app, this));
  }
  async loadSettings() {
    const saved = await this.loadData();
    if (!saved || typeof saved !== "object") return;
    const data = saved;
    if (typeof data.base === "string" && data.base.trim()) this.settings.base = data.base.trim();
    if (typeof data.key === "string") this.settings.key = data.key;
    if (typeof data.model === "string" && data.model.trim()) this.settings.model = data.model.trim();
    if (typeof data.maxSteps === "number" && Number.isInteger(data.maxSteps) && data.maxSteps >= 1) this.settings.maxSteps = data.maxSteps;
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async activate() {
    var _a;
    const existing = this.app.workspace.getLeavesOfType(VIEW);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = (_a = this.app.workspace.getRightLeaf(false)) != null ? _a : this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  paint() {
    var _a;
    (_a = this.view) == null ? void 0 : _a.paint();
  }
  clear() {
    if (this.running) {
      this.push({ kind: "error", text: "\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438 \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0437\u0430\u043F\u0440\u043E\u0441" });
      return;
    }
    this.lines = [];
    this.history = [];
    this.paint();
  }
  push(line) {
    this.lines.push(line);
    this.paint();
  }
  async ask(task) {
    if (this.running) return;
    const key = this.settings.key.trim();
    const model = this.settings.model.trim();
    const base = this.settings.base.trim().replace(/\/$/, "");
    if (!key) {
      this.push({ kind: "error", text: "\u0443\u043A\u0430\u0436\u0438 \u043A\u043B\u044E\u0447 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043F\u043B\u0430\u0433\u0438\u043D\u0430" });
      return;
    }
    if (!model || !base) {
      this.push({ kind: "error", text: "\u0443\u043A\u0430\u0436\u0438 \u0430\u0434\u0440\u0435\u0441 API \u0438 \u043C\u043E\u0434\u0435\u043B\u044C" });
      return;
    }
    const active = this.activePath();
    const selected = this.selection();
    const prompt = [selected ? "\u0412\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435:\n" + selected : "", "\u0417\u0430\u0434\u0430\u043D\u0438\u0435:\n" + task].filter(Boolean).join("\n\n");
    this.history.push({ role: "user", content: prompt });
    this.push({ kind: "user", text: task });
    this.running = true;
    this.stop = false;
    this.paint();
    const messages = [{ role: "system", content: systemPrompt(active) }, ...this.history.filter((item) => item.role !== "system")];
    try {
      await runAgent({
        messages,
        maxSteps: this.settings.maxSteps,
        shouldStop: () => this.stop,
        onLine: (line) => this.push({ kind: "tool", text: line }),
        post: (batch) => this.post(base, key, model, batch),
        callTool: (name, args) => dispatchTool(this.vaultFs(), name, args)
      });
      const last = messages[messages.length - 1];
      const text = (last == null ? void 0 : last.role) === "assistant" && typeof last.content === "string" ? last.content : "";
      if (!text.trim()) this.push({ kind: "error", text: "\u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430" });
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
  activePath() {
    var _a, _b, _c;
    return (_c = (_b = (_a = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView)) == null ? void 0 : _a.file) == null ? void 0 : _b.path) != null ? _c : "";
  }
  selection() {
    var _a, _b;
    return (_b = (_a = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView)) == null ? void 0 : _a.editor.getSelection()) != null ? _b : "";
  }
  async post(base, key, model, messages) {
    var _a, _b, _c;
    const res = await (0, import_obsidian.requestUrl)({
      url: base + "/chat/completions",
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, tools: TOOLS }),
      throw: false
    });
    if (res.status < 200 || res.status >= 300) {
      const body = (res.text || "").slice(0, 500);
      throw new Error("\u043C\u043E\u0434\u0435\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430 " + res.status + (body ? ": " + body : ""));
    }
    const data = res.json;
    const message = (_b = (_a = data.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message;
    if (!message) throw new Error("\u0432 \u043E\u0442\u0432\u0435\u0442\u0435 \u043D\u0435\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F");
    return { content: (_c = message.content) != null ? _c : null, tool_calls: message.tool_calls };
  }
  vaultFs() {
    const app = this.app;
    return {
      async find(path) {
        const file = app.vault.getAbstractFileByPath(path);
        if (!file) return null;
        return { path: file.path, folder: file instanceof import_obsidian.TFolder };
      },
      async findMany(name) {
        const base = name.split("/").pop() || name;
        return app.vault.getFiles().filter((file) => file.path === name || file.path.endsWith("/" + name) || file.name === base).map((file) => file.path);
      },
      async read(path) {
        const file = app.vault.getAbstractFileByPath(path);
        if (!(file instanceof import_obsidian.TFile)) throw new Error("\u043D\u0435\u0442 \u0444\u0430\u0439\u043B\u0430 " + path);
        return app.vault.read(file);
      },
      async write(path, content) {
        var _a;
        const file = app.vault.getAbstractFileByPath(path);
        if (file instanceof import_obsidian.TFolder) throw new Error("\u044D\u0442\u043E \u043F\u0430\u043F\u043A\u0430");
        if (file instanceof import_obsidian.TFile) {
          const view = app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
          if (((_a = view == null ? void 0 : view.file) == null ? void 0 : _a.path) === path) {
            view.editor.setValue(content);
            return;
          }
          await app.vault.modify(file, content);
          return;
        }
        const slash = path.lastIndexOf("/");
        if (slash > 0) {
          const parent = path.slice(0, slash);
          if (!(app.vault.getAbstractFileByPath(parent) instanceof import_obsidian.TFolder)) throw new Error("\u043D\u0435\u0442 \u043F\u0430\u043F\u043A\u0438 " + parent);
        }
        await app.vault.create(path, content);
      },
      async bytes(path) {
        const file = app.vault.getAbstractFileByPath(path);
        if (!(file instanceof import_obsidian.TFile)) throw new Error("\u043D\u0435\u0442 \u0444\u0430\u0439\u043B\u0430 " + path);
        return new Uint8Array(await app.vault.readBinary(file));
      },
      async children(path) {
        const folder = path ? app.vault.getAbstractFileByPath(path) : app.vault.getRoot();
        if (!folder) throw new Error("\u043D\u0435\u0442 \u043F\u0430\u043F\u043A\u0438 " + path);
        if (!(folder instanceof import_obsidian.TFolder)) throw new Error("\u044D\u0442\u043E \u043D\u0435 \u043F\u0430\u043F\u043A\u0430");
        return folder.children.map((child) => ({ path: child.path, folder: child instanceof import_obsidian.TFolder }));
      }
    };
  }
};
var AgentView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.logEl = null;
    this.inputEl = null;
    this.sendEl = null;
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return "\u0410\u0433\u0435\u043D\u0442";
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
    this.inputEl = root.createEl("textarea", { attr: { rows: "4", placeholder: "\u0427\u0442\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0441 \u0437\u0430\u043C\u0435\u0442\u043A\u043E\u0439" } });
    const row = root.createDiv({ cls: "agent-row" });
    this.sendEl = row.createEl("button", { text: "\u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C" });
    this.sendEl.addEventListener("click", () => this.onSend());
    const clear = row.createEl("button", { text: "\u043E\u0447\u0438\u0441\u0442\u0438\u0442\u044C" });
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
    this.sendEl.setText(this.plugin.running ? "\u0441\u0442\u043E\u043F" : "\u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C");
  }
  onSend() {
    var _a, _b;
    if (this.plugin.running) {
      this.plugin.stop = true;
      return;
    }
    const text = (_b = (_a = this.inputEl) == null ? void 0 : _a.value.trim()) != null ? _b : "";
    if (!text) return;
    if (this.inputEl) this.inputEl.value = "";
    void this.plugin.ask(text);
  }
};
var AgentSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("\u0410\u0434\u0440\u0435\u0441 API").setDesc("OpenAI-\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u044B\u0439 \u0430\u0434\u0440\u0435\u0441, \u0431\u0435\u0437 /chat/completions").addText((text) => text.setPlaceholder(DEFAULT_SETTINGS.base).setValue(this.plugin.settings.base).onChange(async (value) => {
      this.plugin.settings.base = value.trim();
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u041A\u043B\u044E\u0447").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(this.plugin.settings.key).onChange(async (value) => {
        this.plugin.settings.key = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("\u041C\u043E\u0434\u0435\u043B\u044C").setDesc("\u041D\u0443\u0436\u043D\u044B \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B \u0438 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 gpt-4o").addText((text) => text.setValue(this.plugin.settings.model).onChange(async (value) => {
      this.plugin.settings.model = value.trim();
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u0428\u0430\u0433\u043E\u0432 \u0437\u0430 \u043E\u0442\u0432\u0435\u0442").addText((text) => text.setValue(String(this.plugin.settings.maxSteps)).onChange(async (value) => {
      const steps = Number(value);
      if (!Number.isInteger(steps) || steps < 1 || steps > 30) {
        new import_obsidian.Notice("\u0448\u0430\u0433\u0438: \u0446\u0435\u043B\u043E\u0435 \u043E\u0442 1 \u0434\u043E 30");
        return;
      }
      this.plugin.settings.maxSteps = steps;
      await this.plugin.saveSettings();
    }));
  }
};
