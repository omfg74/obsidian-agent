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

// src/settings.ts
function freshSettings() {
  return {
    providers: [{ id: "openai", name: "OpenAI", base: "https://api.openai.com/v1", key: "", model: "gpt-4o" }],
    activeId: "openai",
    maxSteps: 8
  };
}
function newProviderId() {
  if (typeof crypto.randomUUID !== "function") throw new Error("\u043D\u0435\u0442 crypto.randomUUID");
  return crypto.randomUUID();
}
function settingsFromSaved(saved) {
  if (!saved || typeof saved !== "object") return freshSettings();
  const data = saved;
  const maxSteps = readSteps(data.maxSteps);
  if ("providers" in data) {
    const providers = readProviders(data.providers);
    const activeId = typeof data.activeId === "string" ? data.activeId : "";
    return { providers, activeId, maxSteps };
  }
  if ("base" in data || "key" in data || "model" in data) {
    const provider = {
      id: "saved",
      name: "\u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439",
      base: typeof data.base === "string" ? data.base.trim() : "",
      key: typeof data.key === "string" ? data.key : "",
      model: typeof data.model === "string" ? data.model.trim() : ""
    };
    return { providers: [provider], activeId: provider.id, maxSteps };
  }
  return { ...freshSettings(), maxSteps };
}
function readSteps(value) {
  if (value === void 0) return 8;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 30) return value;
  throw new Error("\u0448\u0430\u0433\u0438 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B");
}
function readProviders(value) {
  if (!Array.isArray(value)) throw new Error("\u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D");
  const ids = /* @__PURE__ */ new Set();
  return value.map((item) => {
    const provider = readProvider(item);
    if (ids.has(provider.id)) throw new Error("\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u044B \u0441 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u043C id");
    ids.add(provider.id);
    return provider;
  });
}
function readProvider(item) {
  if (!item || typeof item !== "object") throw new Error("\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D");
  const row = item;
  if (typeof row.id !== "string" || !row.id.trim()) throw new Error("\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0431\u0435\u0437 id");
  if (typeof row.name !== "string") throw new Error("\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0431\u0435\u0437 \u0438\u043C\u0435\u043D\u0438");
  if (typeof row.base !== "string") throw new Error("\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0431\u0435\u0437 \u0430\u0434\u0440\u0435\u0441\u0430");
  if (typeof row.key !== "string") throw new Error("\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0431\u0435\u0437 \u043A\u043B\u044E\u0447\u0430");
  if (typeof row.model !== "string") throw new Error("\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0431\u0435\u0437 \u043C\u043E\u0434\u0435\u043B\u0438");
  return {
    id: row.id.trim(),
    name: row.name.trim(),
    base: row.base.trim(),
    key: row.key,
    model: row.model.trim()
  };
}

// src/chats.ts
function newSession() {
  return { id: newProviderId(), title: "\u043D\u043E\u0432\u044B\u0439 \u0447\u0430\u0442", lines: [], history: [], imagesOmitted: false };
}
function sessionTitle(lines) {
  var _a, _b;
  const text = (_b = (_a = lines.find((line) => line.kind === "user")) == null ? void 0 : _a.text.trim()) != null ? _b : "";
  if (!text) return "\u043D\u043E\u0432\u044B\u0439 \u0447\u0430\u0442";
  return text.length > 40 ? text.slice(0, 40) + "\u2026" : text;
}
function stripImages(history) {
  let imagesOmitted = false;
  const next = history.map((message) => {
    if (!Array.isArray(message.content)) return message;
    const parts = message.content.filter((part) => part.type !== "image_url");
    if (parts.length === message.content.length) return message;
    imagesOmitted = true;
    return { ...message, content: textContent(parts) };
  });
  return { history: next, imagesOmitted };
}
function textContent(parts) {
  if (parts.length === 1 && parts[0].type === "text") return parts[0].text;
  return parts;
}
function sessionsFromSaved(saved) {
  if (!saved || typeof saved !== "object" || !("sessions" in saved)) return null;
  const data = saved;
  if (!Array.isArray(data.sessions)) throw new Error("\u0441\u043F\u0438\u0441\u043E\u043A \u0447\u0430\u0442\u043E\u0432 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D");
  const ids = /* @__PURE__ */ new Set();
  const sessions = data.sessions.map((item) => {
    const session = readSession(item);
    if (ids.has(session.id)) throw new Error("\u0447\u0430\u0442\u044B \u0441 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u043C id");
    ids.add(session.id);
    return session;
  });
  const sessionId = typeof data.sessionId === "string" ? data.sessionId : "";
  return { sessions, sessionId };
}
function readSession(item) {
  if (!item || typeof item !== "object") throw new Error("\u0447\u0430\u0442 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D");
  const row = item;
  if (typeof row.id !== "string" || !row.id.trim()) throw new Error("\u0447\u0430\u0442 \u0431\u0435\u0437 id");
  if (typeof row.title !== "string") throw new Error("\u0447\u0430\u0442 \u0431\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F");
  if (!Array.isArray(row.lines) || !Array.isArray(row.history)) throw new Error("\u0447\u0430\u0442 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D");
  if (typeof row.imagesOmitted !== "boolean") throw new Error("\u0447\u0430\u0442 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D");
  return {
    id: row.id.trim(),
    title: row.title.trim(),
    lines: row.lines.map(readLine),
    history: row.history.map(readMessage),
    imagesOmitted: row.imagesOmitted
  };
}
function readLine(item) {
  if (!item || typeof item !== "object") throw new Error("\u0441\u0442\u0440\u043E\u043A\u0430 \u0447\u0430\u0442\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u0430");
  const row = item;
  if (row.kind !== "user" && row.kind !== "assistant" && row.kind !== "tool" && row.kind !== "error") throw new Error("\u0441\u0442\u0440\u043E\u043A\u0430 \u0447\u0430\u0442\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u0430");
  if (typeof row.text !== "string") throw new Error("\u0441\u0442\u0440\u043E\u043A\u0430 \u0447\u0430\u0442\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u0430");
  return { kind: row.kind, text: row.text };
}
function readMessage(item) {
  if (!item || typeof item !== "object") throw new Error("\u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0447\u0430\u0442\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u043E");
  const row = item;
  if (row.role !== "user" && row.role !== "assistant" && row.role !== "tool" && row.role !== "system") throw new Error("\u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0447\u0430\u0442\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u043E");
  const message = { role: row.role, content: readContent(row.content) };
  if (row.tool_call_id !== void 0) {
    if (typeof row.tool_call_id !== "string" || !row.tool_call_id) throw new Error("\u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0447\u0430\u0442\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u043E");
    message.tool_call_id = row.tool_call_id;
  }
  if (row.tool_calls !== void 0) {
    if (!Array.isArray(row.tool_calls)) throw new Error("\u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0447\u0430\u0442\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u043E");
    message.tool_calls = row.tool_calls.map(readToolCall);
  }
  return message;
}
function readContent(value) {
  if (value === null || typeof value === "string") return value;
  if (!Array.isArray(value)) throw new Error("\u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0447\u0430\u0442\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u043E");
  return value.map((part) => {
    if (!part || typeof part !== "object") throw new Error("\u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0447\u0430\u0442\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u043E");
    const row = part;
    if (row.type !== "text" || typeof row.text !== "string") throw new Error("\u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0447\u0430\u0442\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u043E");
    return { type: "text", text: row.text };
  });
}
function readToolCall(item) {
  if (!item || typeof item !== "object") throw new Error("\u0432\u044B\u0437\u043E\u0432 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D");
  const row = item;
  const fn = row.function;
  if (typeof row.id !== "string" || !row.id || !fn || typeof fn !== "object") throw new Error("\u0432\u044B\u0437\u043E\u0432 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D");
  const func = fn;
  if (typeof func.name !== "string" || typeof func.arguments !== "string") throw new Error("\u0432\u044B\u0437\u043E\u0432 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D");
  return { id: row.id, type: "function", function: { name: func.name, arguments: func.arguments } };
}

// src/models.ts
function modelIds(body) {
  if (!body || typeof body !== "object" || !("data" in body)) throw new Error("\u0432 \u043E\u0442\u0432\u0435\u0442\u0435 \u043D\u0435\u0442 \u0441\u043F\u0438\u0441\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0435\u0439");
  const data = body.data;
  if (!Array.isArray(data)) throw new Error("\u0432 \u043E\u0442\u0432\u0435\u0442\u0435 \u043D\u0435\u0442 \u0441\u043F\u0438\u0441\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0435\u0439");
  if (data.length === 0) throw new Error("\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0438 \u043E\u0434\u043D\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438");
  const ids = [];
  for (const item of data) {
    if (!item || typeof item !== "object" || typeof item.id !== "string") throw new Error("\u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u0435\u0441\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u0431\u0435\u0437 id");
    const id = item.id.trim();
    if (!id) throw new Error("\u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u0435\u0441\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u0431\u0435\u0437 id");
    if (!ids.includes(id)) ids.push(id);
  }
  ids.sort((a, b) => a.localeCompare(b));
  return ids;
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
var AgentPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = freshSettings();
    this.sessions = [];
    this.sessionId = "";
    this.running = false;
    this.stop = false;
    this.view = null;
  }
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW, (leaf) => new AgentView(leaf, this));
    this.addRibbonIcon("bot", "\u0410\u0433\u0435\u043D\u0442", () => this.activate());
    this.addCommand({ id: "open", name: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C", callback: () => this.activate() });
    this.addCommand({ id: "new-chat", name: "\u041D\u043E\u0432\u044B\u0439 \u0447\u0430\u0442", callback: () => void this.newChat() });
    this.addSettingTab(new AgentSettingTab(this.app, this));
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
    const migrate = !saved || typeof saved !== "object" || !("providers" in saved) || !("sessions" in saved);
    if (saved && typeof saved === "object" && migrate) await this.saveSettings();
  }
  activeSession() {
    var _a;
    return (_a = this.sessions.find((item) => item.id === this.sessionId)) != null ? _a : null;
  }
  async newChat() {
    if (this.running) {
      new import_obsidian.Notice("\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438 \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0437\u0430\u043F\u0440\u043E\u0441");
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
  async openSession(id) {
    if (this.running) {
      new import_obsidian.Notice("\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438 \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0437\u0430\u043F\u0440\u043E\u0441");
      this.paint();
      return;
    }
    if (!this.sessions.some((item) => item.id === id)) {
      new import_obsidian.Notice("\u043D\u0435\u0442 \u0447\u0430\u0442\u0430");
      this.paint();
      return;
    }
    this.sessionId = id;
    await this.saveSettings();
    this.paint();
  }
  async deleteSession() {
    if (this.running) {
      new import_obsidian.Notice("\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438 \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0437\u0430\u043F\u0440\u043E\u0441");
      return;
    }
    const current = this.activeSession();
    if (!current) {
      new import_obsidian.Notice("\u043D\u0435\u0442 \u0447\u0430\u0442\u0430");
      return;
    }
    this.sessions = this.sessions.filter((item) => item.id !== current.id);
    this.sessionId = "";
    await this.saveSettings();
    this.paint();
  }
  activeProvider() {
    var _a;
    return (_a = this.settings.providers.find((item) => item.id === this.settings.activeId)) != null ? _a : null;
  }
  async fetchModelIds(provider) {
    const base = provider.base.trim().replace(/\/$/, "");
    const key = provider.key.trim();
    if (!base || !key) throw new Error("\u0443\u043A\u0430\u0436\u0438 \u0430\u0434\u0440\u0435\u0441 API \u0438 \u043A\u043B\u044E\u0447");
    const res = await (0, import_obsidian.requestUrl)({
      url: base + "/models",
      method: "GET",
      headers: { Authorization: "Bearer " + key },
      throw: false
    });
    if (res.status < 200 || res.status >= 300) {
      const body = (res.text || "").slice(0, 500);
      throw new Error("\u0441\u043F\u0438\u0441\u043E\u043A \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u043E\u0442\u0432\u0435\u0442\u0438\u043B " + res.status + (body ? ": " + body : ""));
    }
    return modelIds(res.json);
  }
  async saveSettings() {
    const sessions = this.sessions.map((session) => {
      const stored = stripImages(session.history);
      return { ...session, history: stored.history, imagesOmitted: session.imagesOmitted || stored.imagesOmitted };
    });
    await this.saveData({ ...this.settings, sessions, sessionId: this.sessionId });
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
  push(line) {
    const session = this.activeSession();
    if (!session) throw new Error("\u043D\u0435\u0442 \u0447\u0430\u0442\u0430");
    session.lines.push(line);
    if (line.kind === "user") session.title = sessionTitle(session.lines);
    this.paint();
  }
  async ask(task) {
    if (this.running) return;
    const session = this.activeSession();
    if (!session) {
      new import_obsidian.Notice("\u043D\u0435\u0442 \u0447\u0430\u0442\u0430");
      return;
    }
    const provider = this.activeProvider();
    if (!provider) {
      this.push({ kind: "error", text: "\u0432\u044B\u0431\u0435\u0440\u0438 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043F\u043B\u0430\u0433\u0438\u043D\u0430" });
      return;
    }
    const key = provider.key.trim();
    const model = provider.model.trim();
    const base = provider.base.trim().replace(/\/$/, "");
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
    session.history.push({ role: "user", content: prompt });
    this.push({ kind: "user", text: task });
    this.running = true;
    this.stop = false;
    this.paint();
    const messages = [{ role: "system", content: systemPrompt(active) }, ...session.history.filter((item) => item.role !== "system")];
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
      session.history = messages.filter((item) => item.role !== "system");
      this.running = false;
      this.stop = false;
      this.paint();
      await this.saveSettings();
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
    this.providerEl = null;
    this.providerSignature = "";
    this.modelEl = null;
    this.modelSignature = "";
    this.modelState = null;
    this.modelLoading = "";
    this.chatEl = null;
    this.chatSignature = "";
    this.noteEl = null;
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
      var _a, _b;
      const provider = this.plugin.activeProvider();
      const value = (_b = (_a = this.modelEl) == null ? void 0 : _a.value.trim()) != null ? _b : "";
      if (!provider || !value) return;
      provider.model = value;
      void this.plugin.saveSettings();
    });
    const chatRow = root.createDiv({ cls: "agent-chat-row" });
    this.chatEl = chatRow.createEl("select");
    this.chatEl.addEventListener("change", () => {
      var _a, _b;
      const value = (_b = (_a = this.chatEl) == null ? void 0 : _a.value) != null ? _b : "";
      if (!value) return;
      void this.plugin.openSession(value);
    });
    chatRow.createEl("button", { text: "\u043D\u043E\u0432\u044B\u0439 \u0447\u0430\u0442" }).addEventListener("click", () => void this.plugin.newChat());
    chatRow.createEl("button", { text: "\u0443\u0431\u0440\u0430\u0442\u044C" }).addEventListener("click", () => void this.plugin.deleteSession());
    this.noteEl = root.createDiv({ cls: "agent-tool" });
    this.logEl = root.createDiv({ cls: "agent-log" });
    this.inputEl = root.createEl("textarea", { attr: { rows: "4", placeholder: "\u0427\u0442\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0441 \u0437\u0430\u043C\u0435\u0442\u043A\u043E\u0439" } });
    const row = root.createDiv({ cls: "agent-row" });
    this.sendEl = row.createEl("button", { text: "\u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C" });
    this.sendEl.addEventListener("click", () => this.onSend());
    this.paint();
  }
  async onClose() {
    if (this.plugin.view === this) this.plugin.view = null;
  }
  paint() {
    var _a;
    if (!this.logEl || !this.sendEl) return;
    this.syncProviderSelect();
    this.syncModelSelect();
    this.syncChatSelect();
    const provider = this.plugin.activeProvider();
    const listed = ((_a = this.modelState) == null ? void 0 : _a.providerId) === (provider == null ? void 0 : provider.id);
    if ((provider == null ? void 0 : provider.base.trim()) && provider.key.trim() && !listed && this.modelLoading !== provider.id) void this.loadChatModels();
    const session = this.plugin.activeSession();
    if (this.noteEl) {
      this.noteEl.hidden = !(session == null ? void 0 : session.imagesOmitted);
      this.noteEl.setText((session == null ? void 0 : session.imagesOmitted) ? "\u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438 \u044D\u0442\u043E\u0433\u043E \u0447\u0430\u0442\u0430 \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B, \u043C\u043E\u0434\u0435\u043B\u044C \u0438\u0445 \u043D\u0435 \u0432\u0438\u0434\u0438\u0442" : "");
    }
    this.logEl.empty();
    if (session) {
      for (const line of session.lines) {
        this.logEl.createDiv({ cls: "agent-line agent-" + line.kind, text: line.text });
      }
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
  syncProviderSelect() {
    const select = this.providerEl;
    if (!select) return;
    const providers = this.plugin.settings.providers;
    const signature = providers.map((item) => item.id + "\0" + item.name).join("\n");
    if (this.providerSignature !== signature) {
      while (select.options.length > 0) select.remove(0);
      const known = providers.some((item) => item.id === this.plugin.settings.activeId);
      if (!known) select.add(new Option(providers.length === 0 ? "\u043D\u0435\u0442 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430" : "\u0432\u044B\u0431\u0435\u0440\u0438 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430", ""));
      for (const item of providers) select.add(new Option(item.name || item.id, item.id));
      this.providerSignature = signature;
    }
    const wanted = providers.some((item) => item.id === this.plugin.settings.activeId) ? this.plugin.settings.activeId : "";
    if (select.value !== wanted) select.value = wanted;
  }
  syncChatSelect() {
    const select = this.chatEl;
    if (!select) return;
    const sessions = this.plugin.sessions;
    const signature = sessions.map((item) => item.id + "\0" + item.title).join("\n");
    if (this.chatSignature !== signature) {
      while (select.options.length > 0) select.remove(0);
      const known = sessions.some((item) => item.id === this.plugin.sessionId);
      if (!known) select.add(new Option(sessions.length === 0 ? "\u043D\u0435\u0442 \u0447\u0430\u0442\u0430" : "\u0432\u044B\u0431\u0435\u0440\u0438 \u0447\u0430\u0442", ""));
      for (const item of sessions) select.add(new Option(item.title || item.id, item.id));
      this.chatSignature = signature;
    }
    const wanted = sessions.some((item) => item.id === this.plugin.sessionId) ? this.plugin.sessionId : "";
    if (select.value !== wanted) select.value = wanted;
  }
  syncModelSelect() {
    var _a, _b, _c;
    const select = this.modelEl;
    if (!select) return;
    const provider = this.plugin.activeProvider();
    const ids = provider && ((_a = this.modelState) == null ? void 0 : _a.providerId) === provider.id && "ids" in this.modelState ? this.modelState.ids : [];
    const current = (_b = provider == null ? void 0 : provider.model.trim()) != null ? _b : "";
    const placeholder = !provider ? "\u0432\u044B\u0431\u0435\u0440\u0438 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430" : !current && ids.length === 0 ? "\u043D\u0435\u0442 \u0441\u043F\u0438\u0441\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0435\u0439" : !current ? "\u0432\u044B\u0431\u0435\u0440\u0438 \u043C\u043E\u0434\u0435\u043B\u044C" : "";
    const signature = ((_c = provider == null ? void 0 : provider.id) != null ? _c : "") + "\0" + placeholder + "\0" + current + "\0" + ids.join("\n");
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
  async loadChatModels() {
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
};
var AgentSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    const providers = this.plugin.settings.providers;
    const active = this.plugin.activeProvider();
    new import_obsidian.Setting(containerEl).setName("\u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440").addDropdown((menu) => {
      var _a;
      if (!active) menu.addOption("", providers.length ? "\u0432\u044B\u0431\u0435\u0440\u0438 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430" : "\u043D\u0435\u0442 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430");
      for (const item of providers) menu.addOption(item.id, item.name || item.id);
      menu.setValue((_a = active == null ? void 0 : active.id) != null ? _a : "").onChange(async (value) => {
        this.plugin.settings.activeId = value;
        await this.plugin.saveSettings();
        this.plugin.paint();
        this.display();
      });
    }).addButton((button) => button.setButtonText("\u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C").onClick(() => this.addProvider())).addButton((button) => button.setButtonText("\u0443\u0431\u0440\u0430\u0442\u044C").onClick(() => this.removeProvider()));
    if (!active) {
      new import_obsidian.Setting(containerEl).setDesc(providers.length ? "\u0432\u044B\u0431\u0435\u0440\u0438 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430" : "\u0434\u043E\u0431\u0430\u0432\u044C \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430");
    } else {
      this.providerFields(containerEl, active);
    }
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
  providerFields(containerEl, provider) {
    new import_obsidian.Setting(containerEl).setName("\u0418\u043C\u044F").addText((text) => text.setValue(provider.name).onChange(async (value) => {
      provider.name = value.trim();
      await this.plugin.saveSettings();
      this.plugin.paint();
    }));
    new import_obsidian.Setting(containerEl).setName("\u0410\u0434\u0440\u0435\u0441 API").setDesc("OpenAI-\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u044B\u0439 \u0430\u0434\u0440\u0435\u0441, \u0431\u0435\u0437 /chat/completions").addText((text) => text.setPlaceholder("https://api.openai.com/v1").setValue(provider.base).onChange(async (value) => {
      provider.base = value.trim();
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u041A\u043B\u044E\u0447").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(provider.key).onChange(async (value) => {
        provider.key = value;
        await this.plugin.saveSettings();
      });
    });
    const modelSetting = new import_obsidian.Setting(containerEl).setName("\u041C\u043E\u0434\u0435\u043B\u044C").setDesc("\u0437\u0430\u0433\u0440\u0443\u0436\u0430\u044E \u0441\u043F\u0438\u0441\u043E\u043A\u2026");
    let dropdown = null;
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
    modelSetting.addButton((button) => button.setButtonText("\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C").onClick(() => {
      if (!dropdown) return;
      void this.fillModels(modelSetting, dropdown, provider);
    }));
    if (dropdown) void this.fillModels(modelSetting, dropdown, provider);
  }
  async addProvider() {
    const provider = {
      id: newProviderId(),
      name: "\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 " + (this.plugin.settings.providers.length + 1),
      base: "",
      key: "",
      model: ""
    };
    this.plugin.settings.providers.push(provider);
    this.plugin.settings.activeId = provider.id;
    await this.plugin.saveSettings();
    this.plugin.paint();
    this.display();
  }
  async removeProvider() {
    const current = this.plugin.activeProvider();
    if (!current) {
      new import_obsidian.Notice("\u0432\u044B\u0431\u0435\u0440\u0438 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430");
      return;
    }
    this.plugin.settings.providers = this.plugin.settings.providers.filter((item) => item.id !== current.id);
    this.plugin.settings.activeId = "";
    await this.plugin.saveSettings();
    this.plugin.paint();
    this.display();
  }
  async fillModels(setting, dropdown, provider) {
    if (!provider.base.trim() || !provider.key.trim()) {
      setting.setDesc("\u0443\u043A\u0430\u0436\u0438 \u0430\u0434\u0440\u0435\u0441 API \u0438 \u043A\u043B\u044E\u0447, \u0437\u0430\u0442\u0435\u043C \u043D\u0430\u0436\u043C\u0438 \xAB\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C\xBB");
      return;
    }
    try {
      const ids = await this.plugin.fetchModelIds(provider);
      if (this.plugin.settings.activeId !== provider.id) return;
      const current = provider.model.trim();
      dropdown.selectEl.length = 0;
      if (!current) dropdown.addOption("", "\u0432\u044B\u0431\u0435\u0440\u0438 \u043C\u043E\u0434\u0435\u043B\u044C");
      else if (!ids.includes(current)) dropdown.addOption(current, current);
      for (const id of ids) dropdown.addOption(id, id);
      dropdown.setValue(current);
      const missing = current && !ids.includes(current) ? " \u0422\u0435\u043A\u0443\u0449\u0435\u0439 \u043C\u043E\u0434\u0435\u043B\u0438 \u043D\u0435\u0442 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430." : "";
      setting.setDesc(ids.length + " \u043C\u043E\u0434\u0435\u043B\u0435\u0439. \u041D\u0443\u0436\u043D\u044B \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u044B \u0438 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438." + missing);
    } catch (err) {
      if (this.plugin.settings.activeId !== provider.id) return;
      const message = err instanceof Error ? err.message : String(err);
      setting.setDesc(message);
      new import_obsidian.Notice(message);
    }
  }
};
