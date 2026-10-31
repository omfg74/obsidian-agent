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
  const where = activePath ? "\u0424\u043E\u043A\u0443\u0441: " + activePath + ". \xAB\u042D\u0442\u043E\u0442 \u0444\u0430\u0439\u043B\xBB, \xAB\u044D\u0442\u0430 \u0437\u0430\u043C\u0435\u0442\u043A\u0430\xBB \u0438 \xAB\u0437\u0434\u0435\u0441\u044C\xBB \u2014 \u044D\u0442\u043E \u043E\u043D. \u0422\u0430\u043A\u043E\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u043F\u0440\u0430\u0432\u044C \u0432 \u043D\u0451\u043C, \u0434\u0440\u0443\u0433\u043E\u0439 \u0444\u0430\u0439\u043B \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u0432\u0430\u0439." : "\u0424\u043E\u043A\u0443\u0441 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D. \u041D\u0435 \u0432\u044B\u0434\u0443\u043C\u044B\u0432\u0430\u0439 \u043F\u0443\u0442\u044C \u043A \u0444\u0430\u0439\u043B\u0443.";
  return [
    "\u0422\u044B \u0430\u0433\u0435\u043D\u0442 \u0432\u043D\u0443\u0442\u0440\u0438 Obsidian. \u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0441\u043C\u043E\u0442\u0440\u0438 \u0442\u043E\u043B\u044C\u043A\u043E \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430\u043C\u0438, \u043D\u0435 \u0432\u044B\u0434\u0443\u043C\u044B\u0432\u0430\u0439 \u0442\u0435\u043A\u0441\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0438 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A.",
    "\u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0443 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0442\u043A\u0440\u043E\u0439 \u0447\u0435\u0440\u0435\u0437 view_image. \u041C\u0430\u043B\u0435\u043D\u044C\u043A\u0443\u044E \u043F\u0440\u0430\u0432\u043A\u0443 \u0434\u0435\u043B\u0430\u0439 \u0447\u0435\u0440\u0435\u0437 search_replace.",
    "write_note \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442 \u0444\u0430\u0439\u043B \u0446\u0435\u043B\u0438\u043A\u043E\u043C.",
    where
  ].join("\n");
}
var VISIBLE_TOOL = 240;
function visibleToolResult(name, text) {
  if (text.length <= VISIBLE_TOOL) return name + ": " + text;
  return name + ": " + text.length + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432";
}
function readTurn(body) {
  var _a;
  if (!body || typeof body !== "object") throw new Error("\u0432 \u043E\u0442\u0432\u0435\u0442\u0435 \u043D\u0435\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F");
  const choices = body.choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") throw new Error("\u0432 \u043E\u0442\u0432\u0435\u0442\u0435 \u043D\u0435\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F");
  const choice = choices[0];
  if (!choice.message || typeof choice.message !== "object") throw new Error("\u0432 \u043E\u0442\u0432\u0435\u0442\u0435 \u043D\u0435\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F");
  const message = choice.message;
  const reason = choice.finish_reason;
  return {
    content: (_a = message.content) != null ? _a : null,
    tool_calls: message.tool_calls,
    finishReason: typeof reason === "string" && reason.trim() ? reason : null
  };
}
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("\u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u044B \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430 \u043D\u0435 \u043E\u0431\u044A\u0435\u043A\u0442");
  }
  return value;
}
async function runAgent(input) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const messages = input.messages;
  for (let step = 0; step < input.maxSteps; step++) {
    if ((_a = input.shouldStop) == null ? void 0 : _a.call(input)) throw new Error("\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
    const turn = await input.post(messages);
    (_c = input.onLine) == null ? void 0 : _c.call(input, "finish: " + ((_b = turn.finishReason) != null ? _b : "\u043D\u0435\u0442"));
    const calls = (_d = turn.tool_calls) != null ? _d : [];
    if (calls.length === 0) {
      messages.push({ role: "assistant", content: (_e = turn.content) != null ? _e : "" });
      return messages;
    }
    messages.push({ role: "assistant", content: turn.content, tool_calls: calls });
    for (const call of calls) {
      if ((_f = input.shouldStop) == null ? void 0 : _f.call(input)) throw new Error("\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
      if (!call.id) throw new Error("\u043C\u043E\u0434\u0435\u043B\u044C \u043F\u0440\u0438\u0441\u043B\u0430\u043B\u0430 \u0432\u044B\u0437\u043E\u0432 \u0431\u0435\u0437 id");
      const name = ((_g = call.function) == null ? void 0 : _g.name) || "";
      const raw = (_h = call.function) == null ? void 0 : _h.arguments;
      (_i = input.onLine) == null ? void 0 : _i.call(input, "\u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442 " + name + ", \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442 " + (typeof raw === "string" ? raw.length + " \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432" : "\u043D\u0435 \u0441\u0442\u0440\u043E\u043A\u0430"));
      let output;
      try {
        const args = asRecord(JSON.parse(((_j = call.function) == null ? void 0 : _j.arguments) || "{}"));
        output = await input.callTool(name, args);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output = { text: "\u043E\u0448\u0438\u0431\u043A\u0430: " + message };
      }
      (_k = input.onLine) == null ? void 0 : _k.call(input, visibleToolResult(name, output.text));
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
var PROVIDER_PRESETS = [
  {
    id: "opencode",
    name: "OpenCode",
    base: "https://opencode.ai/inference/openai/v1",
    modelsBase: "https://opencode.ai/inference/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 \u043A\u043E\u043D\u0441\u043E\u043B\u0438 OpenCode. \u0412 \u0441\u043F\u0438\u0441\u043A\u0435 \u0442\u043E\u043B\u044C\u043A\u043E \u043C\u043E\u0434\u0435\u043B\u0438 chat completions: Claude, GPT \u0438 Gemini \u0443 OpenCode \u0438\u0434\u0443\u0442 \u0434\u0440\u0443\u0433\u0438\u043C API. \u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 \u0441\u043D\u0430\u0440\u0443\u0436\u0438 \u043E\u0442\u0432\u0435\u0447\u0430\u044E\u0442 403."
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    base: "https://openrouter.ai/api/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 OpenRouter."
  },
  {
    id: "openai",
    name: "OpenAI",
    base: "https://api.openai.com/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 OpenAI."
  },
  {
    id: "gemini",
    name: "Gemini",
    base: "https://generativelanguage.googleapis.com/v1beta/openai",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 Google AI Studio."
  },
  {
    id: "groq",
    name: "Groq",
    base: "https://api.groq.com/openai/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 Groq."
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    base: "https://api.deepseek.com/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 DeepSeek."
  },
  {
    id: "mistral",
    name: "Mistral",
    base: "https://api.mistral.ai/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 Mistral."
  },
  {
    id: "xai",
    name: "xAI",
    base: "https://api.x.ai/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 xAI."
  },
  {
    id: "anthropic",
    name: "Anthropic",
    base: "https://api.anthropic.com/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 Anthropic."
  },
  {
    id: "cerebras",
    name: "Cerebras",
    base: "https://api.cerebras.ai/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 Cerebras."
  },
  {
    id: "fireworks",
    name: "Fireworks",
    base: "https://api.fireworks.ai/inference/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 Fireworks."
  },
  {
    id: "sambanova",
    name: "SambaNova",
    base: "https://api.sambanova.ai/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 SambaNova."
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    base: "https://router.huggingface.co/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 Hugging Face."
  },
  {
    id: "nvidia",
    name: "NVIDIA",
    base: "https://integrate.api.nvidia.com/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 NVIDIA."
  },
  {
    id: "minimax",
    name: "MiniMax",
    base: "https://api.minimax.io/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 MiniMax."
  },
  {
    id: "cohere",
    name: "Cohere",
    base: "https://api.cohere.com/compatibility/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 Cohere."
  },
  {
    id: "perplexity",
    name: "Perplexity",
    base: "https://api.perplexity.ai",
    modelsBase: "https://api.perplexity.ai/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 Perplexity."
  },
  {
    id: "moonshot",
    name: "Moonshot",
    base: "https://api.moonshot.ai/v1",
    access: "key",
    hint: "\u041A\u043B\u044E\u0447 Moonshot."
  },
  {
    id: "custom",
    name: "\u0421\u0432\u043E\u0439",
    base: "",
    access: "key",
    hint: "\u041B\u044E\u0431\u043E\u0439 OpenAI-\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u044B\u0439 \u0430\u0434\u0440\u0435\u0441, \u0431\u0435\u0437 /chat/completions."
  },
  {
    id: "local",
    name: "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F",
    base: "",
    access: "open",
    hint: "\u0410\u0434\u0440\u0435\u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u0432 \u0441\u0435\u0442\u0438, \u0431\u0435\u0437 /chat/completions. \u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 http://192.168.1.10:11434/v1. \u041D\u0430 iPad \u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F. \u041A\u043B\u044E\u0447 \u043D\u0435 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u0435\u043D."
  }
];
function freshSettings() {
  return {
    providers: [{ id: "openai", name: "OpenAI", base: "https://api.openai.com/v1", key: "", model: "gpt-4o" }],
    activeId: "openai",
    maxSteps: 8
  };
}
function providerLabel(provider) {
  const name = provider.name.trim();
  const generic = name === "" || name === "\u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439" || name === "OpenAI" || /^провайдер \d+$/.test(name);
  let host = "";
  try {
    host = new URL(provider.base).host;
  } catch (e) {
    host = "";
  }
  if (generic && host) return host;
  if (name) return name;
  if (host) return host;
  return provider.id;
}
function newProviderId() {
  if (typeof crypto.randomUUID !== "function") throw new Error("\u043D\u0435\u0442 crypto.randomUUID");
  return crypto.randomUUID();
}
function presetById(id) {
  return PROVIDER_PRESETS.find((item) => item.id === id);
}
function providerFromPreset(preset, id) {
  const provider = {
    id,
    name: preset.name,
    base: preset.base,
    key: "",
    model: "",
    preset: preset.id
  };
  if (preset.access === "open") provider.access = "open";
  if (preset.modelsBase) provider.modelsBase = preset.modelsBase;
  return provider;
}
function providerNeedsKey(provider) {
  return provider.access !== "open";
}
function providerCanList(provider) {
  if (!provider.base.trim()) return false;
  if (providerNeedsKey(provider) && !provider.key.trim()) return false;
  return true;
}
function assignProviderBase(provider, base) {
  const next = base.trim();
  if (provider.modelsBase && provider.preset) {
    const preset = presetById(provider.preset);
    if (preset && next !== preset.base) {
      delete provider.modelsBase;
      delete provider.preset;
    }
  }
  provider.base = next;
}
function requestHeaders(provider, json) {
  const headers = {};
  if (json) headers["Content-Type"] = "application/json";
  const key = provider.key.trim();
  if (!key) {
    if (providerNeedsKey(provider)) throw new Error("\u0443\u043A\u0430\u0436\u0438 \u043A\u043B\u044E\u0447");
    return headers;
  }
  headers.Authorization = "Bearer " + key;
  return headers;
}
function chatCompletionsUrl(provider) {
  return apiBase(provider) + "/chat/completions";
}
function modelsEndpoint(provider) {
  var _a;
  const base = apiBase(provider);
  const root = (((_a = provider.modelsBase) == null ? void 0 : _a.trim()) || base).replace(/\/$/, "");
  return root + "/models";
}
function apiBase(provider) {
  const base = provider.base.trim().replace(/\/$/, "");
  if (!base) throw new Error("\u0443\u043A\u0430\u0436\u0438 \u0430\u0434\u0440\u0435\u0441 API");
  return base;
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
  const provider = {
    id: row.id.trim(),
    name: row.name.trim(),
    base: row.base.trim(),
    key: row.key,
    model: row.model.trim()
  };
  if ("access" in row && row.access !== void 0) {
    if (row.access !== "key" && row.access !== "open") throw new Error("\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0441 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u043E\u043C");
    if (row.access === "open") provider.access = "open";
  }
  if ("modelsBase" in row && row.modelsBase !== void 0) {
    if (typeof row.modelsBase !== "string" || !row.modelsBase.trim()) throw new Error("\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0441 \u043F\u0443\u0441\u0442\u044B\u043C \u0430\u0434\u0440\u0435\u0441\u043E\u043C \u043C\u043E\u0434\u0435\u043B\u0435\u0439");
    provider.modelsBase = row.modelsBase.trim();
  }
  if ("preset" in row && row.preset !== void 0) {
    if (typeof row.preset !== "string" || !row.preset.trim()) throw new Error("\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u0441 \u043F\u0443\u0441\u0442\u043E\u0439 \u043F\u0440\u0435\u0434\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u043E\u0439");
    provider.preset = row.preset.trim();
  }
  return provider;
}

// src/chats.ts
function newSession() {
  return { id: newProviderId(), title: "\u0447\u0430\u0442", lines: [], history: [], imagesOmitted: false };
}
function sessionTitle(lines) {
  var _a, _b;
  const text = (_b = (_a = lines.find((line) => line.kind === "user")) == null ? void 0 : _a.text.trim()) != null ? _b : "";
  if (!text) return "\u0447\u0430\u0442";
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
var PRICE_KEYS = ["prompt", "completion", "input", "output", "request", "image", "hourly", "audio"];
function listedModels(body) {
  if (!body || typeof body !== "object" || !("data" in body)) throw new Error("\u0432 \u043E\u0442\u0432\u0435\u0442\u0435 \u043D\u0435\u0442 \u0441\u043F\u0438\u0441\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0435\u0439");
  const data = body.data;
  if (!Array.isArray(data)) throw new Error("\u0432 \u043E\u0442\u0432\u0435\u0442\u0435 \u043D\u0435\u0442 \u0441\u043F\u0438\u0441\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0435\u0439");
  if (data.length === 0) throw new Error("\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0438 \u043E\u0434\u043D\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438");
  const models = [];
  const seen = /* @__PURE__ */ new Set();
  let foreign = 0;
  for (const item of data) {
    if (!item || typeof item !== "object") throw new Error("\u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u0435\u0441\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u0431\u0435\u0437 id");
    const row = item;
    if (typeof row.id !== "string") throw new Error("\u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u0435\u0441\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u0431\u0435\u0437 id");
    const id = row.id.trim();
    if (!id) throw new Error("\u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u0435\u0441\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u0431\u0435\u0437 id");
    if (!chatCompletionsModel(row)) {
      foreign++;
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    models.push({ id, pay: payOf(row), images: imagesOf(row) });
  }
  if (models.length === 0) {
    throw new Error(foreign > 0 ? "\u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043D\u0435\u0442 \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u0441 chat completions" : "\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B \u043D\u0438 \u043E\u0434\u043D\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438");
  }
  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}
function chatCompletionsModel(row) {
  if (!("api" in row) || row.api == null) return true;
  if (typeof row.api !== "object" || Array.isArray(row.api)) return true;
  return "chat-completions" in row.api;
}
function modelNotes(model) {
  const notes = [];
  if (model.pay === "free") notes.push("\u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E");
  if (model.pay === "paid") notes.push("\u043F\u043B\u0430\u0442\u043D\u043E");
  if (model.images === true) notes.push("\u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438");
  if (model.images === false) notes.push("\u0431\u0435\u0437 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A");
  return notes.join(" \xB7 ");
}
function modelMenuLabel(model) {
  const notes = modelNotes(model);
  if (!notes) return model.id;
  return notes + " \xB7 " + model.id;
}
function payOf(row) {
  if ("pricing" in row && row.pricing != null) return priceTable(row.pricing);
  if ("cost" in row && row.cost != null) return textCost(row.cost);
  return null;
}
function priceTable(pricing) {
  if (pricing === void 0 || pricing === null) return null;
  if (typeof pricing !== "object" || Array.isArray(pricing)) return null;
  const row = pricing;
  const numbers = /* @__PURE__ */ new Map();
  for (const key of PRICE_KEYS) {
    if (!(key in row)) continue;
    const price = priceNumber(row[key]);
    if (price === null) return null;
    numbers.set(key, price);
  }
  const tokens = numbers.has("prompt") && numbers.has("completion") || numbers.has("input") && numbers.has("output");
  if (!tokens) return null;
  for (const price of numbers.values()) {
    if (price > 0) return "paid";
  }
  return "free";
}
function textCost(cost) {
  if (!cost || typeof cost !== "object" || Array.isArray(cost)) return null;
  const text = cost.text;
  if (!text || typeof text !== "object" || Array.isArray(text)) return null;
  const row = text;
  const input = nestedPrice(row.input);
  const output = nestedPrice(row.output);
  if (input === null || output === null) return null;
  if (input > 0 || output > 0) return "paid";
  return "free";
}
function nestedPrice(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return priceNumber(value.price);
}
function priceNumber(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    return value;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(text)) return null;
  const price = Number(text);
  if (!Number.isFinite(price) || price < 0) return null;
  return price;
}
function imagesOf(row) {
  const architecture = row.architecture;
  if (architecture && typeof architecture === "object" && !Array.isArray(architecture)) {
    const spec = architecture;
    if ("input_modalities" in spec) return modalitiesReadImages(spec.input_modalities);
    if (typeof spec.modality === "string") return modalityReadsImages(spec.modality);
  }
  const modalities = mimeModalitiesReadImages(row.modalities);
  if (modalities !== null) return modalities;
  if (typeof row.supports_vision === "boolean") return row.supports_vision;
  if (typeof row.vision === "boolean") return row.vision;
  return null;
}
function mimeModalitiesReadImages(modalities) {
  if (!modalities || typeof modalities !== "object" || Array.isArray(modalities)) return null;
  const input = modalities.input;
  if (!Array.isArray(input) || input.length === 0) return null;
  let image = false;
  for (const item of input) {
    if (typeof item !== "string" || !item.trim()) return null;
    const name = item.trim().toLowerCase();
    if (name === "image" || name.startsWith("image/")) image = true;
  }
  return image;
}
function modalitiesReadImages(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const names = [];
  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) return null;
    names.push(item.trim().toLowerCase());
  }
  return names.includes("image");
}
function modalityReadsImages(modality) {
  const arrow = modality.indexOf("->");
  if (arrow < 0) return null;
  const input = modality.slice(0, arrow).trim().toLowerCase();
  if (!input) return null;
  const parts = input.split("+").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.includes("image");
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
    this.lastNote = "";
    this.focusPath = "";
    this.focusFollow = true;
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
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.rememberNote()));
    this.rememberNote();
  }
  rememberNote() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (!(view == null ? void 0 : view.file)) return;
    this.lastNote = view.file.path;
    if (this.focusPath === view.file.path) return;
    this.focusPath = view.file.path;
    this.focusFollow = true;
    void this.saveSettings();
    this.paint();
  }
  openNotePath() {
    const active = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (active == null ? void 0 : active.file) return active.file.path;
    const open = [];
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (view instanceof import_obsidian.MarkdownView && view.file) open.push(view.file.path);
    }
    if (this.lastNote && open.includes(this.lastNote)) return this.lastNote;
    if (open.length === 1) return open[0];
    return "";
  }
  async focusOpenNote() {
    var _a, _b, _c;
    this.rememberNote();
    let path = (_c = (_b = (_a = this.markdownView()) == null ? void 0 : _a.file) == null ? void 0 : _b.path) != null ? _c : "";
    if (!path) {
      for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
        const view = leaf.view;
        if (view instanceof import_obsidian.MarkdownView && view.file) {
          path = view.file.path;
          break;
        }
      }
    }
    if (!path) {
      new import_obsidian.Notice("\u043D\u0435\u0442 \u043E\u0442\u043A\u0440\u044B\u0442\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0438");
      return;
    }
    await this.setFocus(path, true);
  }
  async setFocus(path, follow) {
    this.focusPath = path;
    this.focusFollow = follow;
    await this.saveSettings();
    this.paint();
  }
  markdownView() {
    var _a;
    const active = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (active == null ? void 0 : active.file) return active;
    if (!this.lastNote) return null;
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (view instanceof import_obsidian.MarkdownView && ((_a = view.file) == null ? void 0 : _a.path) === this.lastNote) return view;
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
      const data = saved;
      if (typeof data.focusPath === "string") this.focusPath = data.focusPath;
      if (typeof data.focusFollow === "boolean") this.focusFollow = data.focusFollow;
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
    if (current && current.lines.length === 0 && current.history.length === 0) {
      new import_obsidian.Notice("\u044D\u0442\u043E\u0442 \u0447\u0430\u0442 \u0443\u0436\u0435 \u043F\u0443\u0441\u0442\u043E\u0439");
      return;
    }
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
  async fetchModels(provider) {
    const res = await (0, import_obsidian.requestUrl)({
      url: modelsEndpoint(provider),
      method: "GET",
      headers: requestHeaders(provider, false),
      throw: false
    });
    if (res.status < 200 || res.status >= 300) {
      const body = (res.text || "").slice(0, 500);
      throw new Error("\u0441\u043F\u0438\u0441\u043E\u043A \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u043E\u0442\u0432\u0435\u0442\u0438\u043B " + res.status + (body ? ": " + body : ""));
    }
    return listedModels(res.json);
  }
  async saveSettings() {
    const sessions = this.sessions.map((session) => {
      const stored = stripImages(session.history);
      return { ...session, history: stored.history, imagesOmitted: session.imagesOmitted || stored.imagesOmitted };
    });
    await this.saveData({ ...this.settings, sessions, sessionId: this.sessionId, focusPath: this.focusPath, focusFollow: this.focusFollow });
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
    var _a;
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
    const model = provider.model.trim();
    const base = provider.base.trim();
    if (providerNeedsKey(provider) && !provider.key.trim()) {
      this.push({ kind: "error", text: "\u0443\u043A\u0430\u0436\u0438 \u043A\u043B\u044E\u0447 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043F\u043B\u0430\u0433\u0438\u043D\u0430" });
      return;
    }
    if (!model || !base) {
      this.push({ kind: "error", text: "\u0443\u043A\u0430\u0436\u0438 \u0430\u0434\u0440\u0435\u0441 API \u0438 \u043C\u043E\u0434\u0435\u043B\u044C" });
      return;
    }
    const active = this.focusPath.trim();
    const view = this.markdownView();
    const selected = ((_a = view == null ? void 0 : view.file) == null ? void 0 : _a.path) === active ? view.editor.getSelection() : "";
    const where = active ? "\u0424\u043E\u043A\u0443\u0441: " + active : "\u0424\u043E\u043A\u0443\u0441 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D.";
    const prompt = [where, selected ? "\u0412\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435:\n" + selected : "", "\u0417\u0430\u0434\u0430\u043D\u0438\u0435:\n" + task].filter(Boolean).join("\n\n");
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
        post: (batch) => this.post(provider, model, batch),
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
  async post(provider, model, messages) {
    const res = await (0, import_obsidian.requestUrl)({
      url: chatCompletionsUrl(provider),
      method: "POST",
      headers: requestHeaders(provider, true),
      body: JSON.stringify({ model, messages, tools: TOOLS }),
      throw: false
    });
    if (res.status < 200 || res.status >= 300) {
      const body = (res.text || "").slice(0, 500);
      throw new Error("\u043C\u043E\u0434\u0435\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430 " + res.status + (body ? ": " + body : ""));
    }
    return readTurn(res.json);
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
        const file = app.vault.getAbstractFileByPath(path);
        if (file instanceof import_obsidian.TFolder) throw new Error("\u044D\u0442\u043E \u043F\u0430\u043F\u043A\u0430");
        if (file instanceof import_obsidian.TFile) {
          const view = app.workspace.getLeavesOfType("markdown").map((leaf) => leaf.view).find((item) => {
            var _a;
            return item instanceof import_obsidian.MarkdownView && ((_a = item.file) == null ? void 0 : _a.path) === path;
          });
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
function iconButton(parent, icon, label) {
  const button = parent.createDiv({
    cls: "clickable-icon agent-icon",
    attr: { role: "button", tabindex: "0", "aria-label": label }
  });
  (0, import_obsidian.setIcon)(button, icon);
  (0, import_obsidian.setTooltip)(button, label);
  button.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    button.click();
  });
  return button;
}
function modelKey(model) {
  var _a;
  const images = model.images === null ? "" : model.images ? "1" : "0";
  return model.id + "\0" + ((_a = model.pay) != null ? _a : "") + "\0" + images;
}
function picker(parent) {
  const wrap = parent.createDiv({ cls: "agent-picker" });
  const select = wrap.createEl("select");
  wrap.createDiv({ cls: "agent-picker-mark", attr: { "aria-hidden": "true" } });
  return select;
}
async function copyLine(text) {
  var _a;
  const write = (_a = navigator.clipboard) == null ? void 0 : _a.writeText;
  if (typeof write !== "function") {
    new import_obsidian.Notice("\u0431\u0443\u0444\u0435\u0440 \u043E\u0431\u043C\u0435\u043D\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D");
    return;
  }
  try {
    await write.call(navigator.clipboard, text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    new import_obsidian.Notice(message || "\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C");
    return;
  }
  new import_obsidian.Notice("\u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E");
}
var AgentView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.logEl = null;
    this.inputEl = null;
    this.sendEl = null;
    this.providerEl = null;
    this.providerSignature = "";
    this.modelTrigger = null;
    this.modelLabel = null;
    this.modelMenu = null;
    this.modelOpen = false;
    this.modelSignature = "";
    this.chipEl = null;
    this.chipLabel = null;
    this.chatLabel = null;
    this.modelState = null;
    this.modelLoading = "";
    this.chatEl = null;
    this.chatSignature = "";
    this.noteEl = null;
    this.closeModelMenu = (event) => {
      var _a, _b;
      if (!this.modelOpen) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (((_a = this.modelMenu) == null ? void 0 : _a.contains(target)) || ((_b = this.modelTrigger) == null ? void 0 : _b.contains(target))) return;
      this.modelOpen = false;
      this.syncModelSelect();
    };
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
    this.noteEl = root.createDiv({ cls: "agent-note" });
    this.logEl = root.createDiv({ cls: "agent-log" });
    const chatRow = root.createDiv({ cls: "agent-chatbar" });
    const chatPicker = chatRow.createDiv({ cls: "agent-chat-picker" });
    this.chatLabel = chatPicker.createSpan({ cls: "agent-chat-label" });
    chatPicker.createDiv({ cls: "agent-picker-mark", attr: { "aria-hidden": "true" } });
    this.chatEl = chatPicker.createEl("select", { cls: "agent-chat-select", attr: { "aria-label": "\u0447\u0430\u0442" } });
    this.chatEl.addEventListener("change", () => {
      var _a, _b;
      const value = (_b = (_a = this.chatEl) == null ? void 0 : _a.value) != null ? _b : "";
      if (!value) return;
      void this.plugin.openSession(value);
    });
    const chatActions = chatRow.createDiv({ cls: "agent-chat-actions" });
    iconButton(chatActions, "plus", "\u043D\u043E\u0432\u044B\u0439 \u0447\u0430\u0442").addEventListener("click", () => void this.plugin.newChat());
    iconButton(chatActions, "trash", "\u0443\u0431\u0440\u0430\u0442\u044C \u0447\u0430\u0442").addEventListener("click", () => void this.plugin.deleteSession());
    const composer = root.createDiv({ cls: "agent-composer" });
    const context = composer.createDiv({ cls: "agent-context" });
    iconButton(context, "at-sign", "\u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0444\u0430\u0439\u043B").addEventListener("click", () => void this.plugin.focusOpenNote());
    this.chipEl = context.createDiv({ cls: "agent-chip" });
    this.chipLabel = this.chipEl.createSpan();
    const closeChip = iconButton(this.chipEl, "x", "\u0443\u0431\u0440\u0430\u0442\u044C \u0444\u0430\u0439\u043B");
    closeChip.addEventListener("click", () => void this.plugin.setFocus("", false));
    this.inputEl = composer.createEl("textarea", { attr: { rows: "3", placeholder: "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 \u0434\u043B\u044F \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u0432 \u0444\u043E\u043A\u0443\u0441\u0435" } });
    const bar = composer.createDiv({ cls: "agent-composer-bar" });
    const modelWrap = bar.createDiv({ cls: "agent-model" });
    this.modelTrigger = modelWrap.createDiv({ cls: "agent-picker agent-model-trigger", attr: { role: "button", tabindex: "0" } });
    this.modelLabel = this.modelTrigger.createSpan({ cls: "agent-model-current" });
    this.modelTrigger.createDiv({ cls: "agent-picker-mark", attr: { "aria-hidden": "true" } });
    this.modelTrigger.addEventListener("click", () => {
      this.modelOpen = !this.modelOpen;
      this.syncModelSelect();
    });
    this.modelTrigger.addEventListener("keydown", (event) => {
      var _a;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      (_a = this.modelTrigger) == null ? void 0 : _a.click();
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
    this.sendEl = iconButton(bar, "arrow-up", "\u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C");
    this.sendEl.classList.add("agent-send");
    this.sendEl.addEventListener("click", () => this.onSend());
    this.paint();
  }
  async onClose() {
    document.removeEventListener("pointerdown", this.closeModelMenu);
    if (this.plugin.view === this) this.plugin.view = null;
  }
  paint() {
    var _a;
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
    this.syncChip();
    this.syncChatSelect();
    const provider = this.plugin.activeProvider();
    const listed = ((_a = this.modelState) == null ? void 0 : _a.providerId) === (provider == null ? void 0 : provider.id);
    if (provider && providerCanList(provider) && !listed && this.modelLoading !== provider.id) void this.loadChatModels();
    const session = this.plugin.activeSession();
    if (this.noteEl) {
      this.noteEl.hidden = !(session == null ? void 0 : session.imagesOmitted);
      this.noteEl.setText((session == null ? void 0 : session.imagesOmitted) ? "\u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438 \u044D\u0442\u043E\u0433\u043E \u0447\u0430\u0442\u0430 \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B, \u043C\u043E\u0434\u0435\u043B\u044C \u0438\u0445 \u043D\u0435 \u0432\u0438\u0434\u0438\u0442" : "");
    }
    this.logEl.empty();
    if (session) {
      for (const line of session.lines) {
        const entry = this.logEl.createDiv({ cls: "agent-entry" });
        entry.createDiv({ cls: "agent-line agent-" + line.kind, text: line.text });
        if ((line.kind === "user" || line.kind === "assistant") && line.text) {
          const actions = entry.createDiv({ cls: "agent-actions" });
          iconButton(actions, "copy", "\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C").addEventListener("click", () => void copyLine(line.text));
        }
      }
    }
    if (this.plugin.running) this.logEl.createDiv({ cls: "agent-spin", attr: { "aria-label": "\u0430\u0433\u0435\u043D\u0442 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442" } });
    this.logEl.scrollTop = this.logEl.scrollHeight;
    const sending = this.plugin.running;
    const sendLabel = sending ? "\u0441\u0442\u043E\u043F" : "\u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C";
    (0, import_obsidian.setIcon)(this.sendEl, sending ? "square" : "arrow-up");
    this.sendEl.ariaLabel = sendLabel;
    (0, import_obsidian.setTooltip)(this.sendEl, sendLabel);
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
    const signature = providers.map((item) => item.id + "\0" + item.name + "\0" + item.base).join("\n");
    if (this.providerSignature !== signature) {
      while (select.options.length > 0) select.remove(0);
      const known = providers.some((item) => item.id === this.plugin.settings.activeId);
      if (!known) select.add(new Option(providers.length === 0 ? "\u043D\u0435\u0442 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430" : "\u0432\u044B\u0431\u0435\u0440\u0438 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430", ""));
      for (const item of providers) select.add(new Option(providerLabel(item), item.id));
      this.providerSignature = signature;
    }
    const hideProvider = providers.length < 2;
    select.hidden = hideProvider;
    if (select.parentElement) select.parentElement.hidden = hideProvider;
    const wanted = providers.some((item) => item.id === this.plugin.settings.activeId) ? this.plugin.settings.activeId : "";
    if (select.value !== wanted) select.value = wanted;
  }
  syncChip() {
    if (!this.chipEl || !this.chipLabel) return;
    const focus = this.plugin.focusPath.trim();
    this.chipEl.hidden = !focus;
    if (!focus) return;
    const name = focus.split("/").pop() || focus;
    const current = this.plugin.openNotePath() === focus ? " \xB7 \u0442\u0435\u043A\u0443\u0449\u0438\u0439" : "";
    this.chipLabel.setText(name + current);
  }
  syncChatSelect() {
    var _a, _b;
    const select = this.chatEl;
    if (!select) return;
    const sessions = this.plugin.sessions;
    const signature = sessions.map((item) => item.id + "\0" + item.title + "\0" + item.lines.length).join("\n");
    if (this.chatSignature !== signature) {
      while (select.options.length > 0) select.remove(0);
      const known = sessions.some((item) => item.id === this.plugin.sessionId);
      if (!known) select.add(new Option(sessions.length === 0 ? "\u043D\u0435\u0442 \u0447\u0430\u0442\u0430" : "\u0432\u044B\u0431\u0435\u0440\u0438 \u0447\u0430\u0442", ""));
      for (const item of sessions) select.add(new Option(item.lines.length === 0 ? "\u0447\u0430\u0442" : item.title || item.id, item.id));
      this.chatSignature = signature;
    }
    const wanted = sessions.some((item) => item.id === this.plugin.sessionId) ? this.plugin.sessionId : "";
    if (select.value !== wanted) select.value = wanted;
    const selected = Array.from(select.options).find((option) => option.value === select.value);
    (_b = this.chatLabel) == null ? void 0 : _b.setText((_a = selected == null ? void 0 : selected.text) != null ? _a : "");
  }
  chooseModel(id) {
    const provider = this.plugin.activeProvider();
    if (!provider || !id) return;
    provider.model = id;
    this.modelOpen = false;
    void this.plugin.saveSettings();
    this.syncModelSelect();
  }
  syncModelSelect() {
    var _a, _b, _c;
    const menu = this.modelMenu;
    const label = this.modelLabel;
    if (!menu || !label || !this.modelTrigger) return;
    const provider = this.plugin.activeProvider();
    const models = provider && ((_a = this.modelState) == null ? void 0 : _a.providerId) === provider.id && "models" in this.modelState ? this.modelState.models : [];
    const current = (_b = provider == null ? void 0 : provider.model.trim()) != null ? _b : "";
    const placeholder = !provider ? "\u043D\u0435\u0442 \u043C\u043E\u0434\u0435\u043B\u0438" : !current && models.length === 0 ? "\u043D\u0435\u0442 \u0441\u043F\u0438\u0441\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0435\u0439" : !current ? "\u043C\u043E\u0434\u0435\u043B\u044C" : "";
    const signature = ((_c = provider == null ? void 0 : provider.id) != null ? _c : "") + "\0" + placeholder + "\0" + current + "\0" + models.map(modelKey).join("\n");
    const shown = current || placeholder;
    const selected = models.find((model) => model.id === current);
    const notes = selected ? modelNotes(selected) : "";
    label.setText(shown);
    const caption = notes ? shown + ", " + notes.split(" \xB7 ").join(", ") : shown;
    this.modelTrigger.ariaLabel = caption;
    (0, import_obsidian.setTooltip)(this.modelTrigger, caption);
    if (this.modelSignature !== signature) {
      menu.empty();
      const rows = current && !models.some((model) => model.id === current) ? [{ id: current, pay: null, images: null }, ...models] : models;
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
  async loadChatModels() {
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
    }).addButton((button) => button.setButtonText("\u0443\u0431\u0440\u0430\u0442\u044C").onClick(() => this.removeProvider()));
    let picked = "";
    new import_obsidian.Setting(containerEl).setName("\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430").setDesc("\u0410\u0434\u0440\u0435\u0441 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0445 \u0441\u0435\u0440\u0432\u0438\u0441\u043E\u0432 \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u0441\u044F \u0441\u0430\u043C. \u0421\u0432\u043E\u0439 \u2014 \u043F\u0443\u0441\u0442\u043E\u0439 \u0430\u0434\u0440\u0435\u0441 \u0438 \u043A\u043B\u044E\u0447. \u041B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u2014 \u0430\u0434\u0440\u0435\u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u0432 \u0441\u0435\u0442\u0438, \u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0430 iPad \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F.").addDropdown((menu) => {
      menu.addOption("", "\u0432\u044B\u0431\u0435\u0440\u0438");
      for (const preset of PROVIDER_PRESETS) menu.addOption(preset.id, preset.name);
      menu.onChange((value) => {
        picked = value;
      });
    }).addButton((button) => button.setButtonText("\u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C").onClick(() => {
      if (!picked) {
        new import_obsidian.Notice("\u0432\u044B\u0431\u0435\u0440\u0438 \u043F\u0440\u0435\u0434\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0443");
        return;
      }
      void this.addProvider(picked);
    }));
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
    var _a;
    new import_obsidian.Setting(containerEl).setName("\u0418\u043C\u044F").addText((text) => text.setValue(provider.name).onChange(async (value) => {
      provider.name = value.trim();
      await this.plugin.saveSettings();
      this.plugin.paint();
    }));
    const preset = provider.preset ? presetById(provider.preset) : void 0;
    new import_obsidian.Setting(containerEl).setName("\u0410\u0434\u0440\u0435\u0441 API").setDesc((_a = preset == null ? void 0 : preset.hint) != null ? _a : "OpenAI-\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u044B\u0439 \u0430\u0434\u0440\u0435\u0441, \u0431\u0435\u0437 /chat/completions").addText((text) => text.setPlaceholder((preset == null ? void 0 : preset.id) === "local" ? "http://192.168.1.10:11434/v1" : "https://api.openai.com/v1").setValue(provider.base).onChange(async (value) => {
      assignProviderBase(provider, value);
      await this.plugin.saveSettings();
    }));
    const keySetting = new import_obsidian.Setting(containerEl).setName("\u041A\u043B\u044E\u0447");
    if (!providerNeedsKey(provider)) keySetting.setDesc("\u043C\u043E\u0436\u043D\u043E \u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C");
    keySetting.addText((text) => {
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
  async addProvider(presetId) {
    const preset = presetById(presetId);
    if (!preset) {
      new import_obsidian.Notice("\u043D\u0435\u0442 \u0442\u0430\u043A\u043E\u0439 \u043F\u0440\u0435\u0434\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438");
      return;
    }
    const provider = providerFromPreset(preset, newProviderId());
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
    if (!providerCanList(provider)) {
      setting.setDesc(providerNeedsKey(provider) ? "\u0443\u043A\u0430\u0436\u0438 \u0430\u0434\u0440\u0435\u0441 API \u0438 \u043A\u043B\u044E\u0447, \u0437\u0430\u0442\u0435\u043C \u043D\u0430\u0436\u043C\u0438 \xAB\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C\xBB" : "\u0443\u043A\u0430\u0436\u0438 \u0430\u0434\u0440\u0435\u0441 API, \u0437\u0430\u0442\u0435\u043C \u043D\u0430\u0436\u043C\u0438 \xAB\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C\xBB");
      return;
    }
    try {
      const models = await this.plugin.fetchModels(provider);
      if (this.plugin.settings.activeId !== provider.id) return;
      const current = provider.model.trim();
      dropdown.selectEl.length = 0;
      if (!current) dropdown.addOption("", "\u0432\u044B\u0431\u0435\u0440\u0438 \u043C\u043E\u0434\u0435\u043B\u044C");
      else if (!models.some((model) => model.id === current)) dropdown.addOption(current, current);
      for (const model of models) dropdown.addOption(model.id, modelMenuLabel(model));
      dropdown.setValue(current);
      const missing = current && !models.some((model) => model.id === current) ? " \u0422\u0435\u043A\u0443\u0449\u0435\u0439 \u043C\u043E\u0434\u0435\u043B\u0438 \u043D\u0435\u0442 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430." : "";
      const tagged = models.some((model) => model.pay !== null || model.images !== null);
      const about = tagged ? " \u0412 \u0441\u043F\u0438\u0441\u043A\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u043E, \u043F\u043B\u0430\u0442\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C \u0438\u043B\u0438 \u043D\u0435\u0442 \u0438 \u0447\u0438\u0442\u0430\u0435\u0442 \u043B\u0438 \u043E\u043D\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438." : " \u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u043D\u0435 \u043F\u0440\u0438\u0441\u043B\u0430\u043B \u0446\u0435\u043D\u0443 \u0438 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A.";
      setting.setDesc(models.length + " \u043C\u043E\u0434\u0435\u043B\u0435\u0439." + about + missing);
    } catch (err) {
      if (this.plugin.settings.activeId !== provider.id) return;
      const message = err instanceof Error ? err.message : String(err);
      setting.setDesc(message);
      new import_obsidian.Notice(message);
    }
  }
};
