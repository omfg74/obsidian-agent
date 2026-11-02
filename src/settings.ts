export interface Provider {
  id: string;
  name: string;
  base: string;
  key: string;
  model: string;
  /** "open" — ключ можно не задавать. Нет поля — ключ обязателен. */
  access?: "open";
  /** Корень списка моделей, если это не base. */
  modelsBase?: string;
  preset?: string;
  /** Секунды ожидания следующих данных. Нет поля — предел самого Obsidian. */
  timeout?: number;
}

export interface ProviderPreset {
  id: string;
  name: string;
  base: string;
  access: "key" | "open";
  hint: string;
  modelsBase?: string;
}

export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    id: "opencode",
    name: "OpenCode",
    base: "https://opencode.ai/inference/openai/v1",
    modelsBase: "https://opencode.ai/inference/v1",
    access: "key",
    hint: "Ключ консоли OpenCode. В списке только модели chat completions: Claude, GPT и Gemini у OpenCode идут другим API. Бесплатные модели снаружи отвечают 403.",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    base: "https://openrouter.ai/api/v1",
    access: "key",
    hint: "Ключ OpenRouter.",
  },
  {
    id: "openai",
    name: "OpenAI",
    base: "https://api.openai.com/v1",
    access: "key",
    hint: "Ключ OpenAI.",
  },
  {
    id: "gemini",
    name: "Gemini",
    base: "https://generativelanguage.googleapis.com/v1beta/openai",
    access: "key",
    hint: "Ключ Google AI Studio.",
  },
  {
    id: "groq",
    name: "Groq",
    base: "https://api.groq.com/openai/v1",
    access: "key",
    hint: "Ключ Groq.",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    base: "https://api.deepseek.com/v1",
    access: "key",
    hint: "Ключ DeepSeek.",
  },
  {
    id: "mistral",
    name: "Mistral",
    base: "https://api.mistral.ai/v1",
    access: "key",
    hint: "Ключ Mistral.",
  },
  {
    id: "xai",
    name: "xAI",
    base: "https://api.x.ai/v1",
    access: "key",
    hint: "Ключ xAI.",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    base: "https://api.anthropic.com/v1",
    access: "key",
    hint: "Ключ Anthropic.",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    base: "https://api.cerebras.ai/v1",
    access: "key",
    hint: "Ключ Cerebras.",
  },
  {
    id: "fireworks",
    name: "Fireworks",
    base: "https://api.fireworks.ai/inference/v1",
    access: "key",
    hint: "Ключ Fireworks.",
  },
  {
    id: "sambanova",
    name: "SambaNova",
    base: "https://api.sambanova.ai/v1",
    access: "key",
    hint: "Ключ SambaNova.",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    base: "https://router.huggingface.co/v1",
    access: "key",
    hint: "Ключ Hugging Face.",
  },
  {
    id: "nvidia",
    name: "NVIDIA",
    base: "https://integrate.api.nvidia.com/v1",
    access: "key",
    hint: "Ключ NVIDIA.",
  },
  {
    id: "minimax",
    name: "MiniMax",
    base: "https://api.minimax.io/v1",
    access: "key",
    hint: "Ключ MiniMax.",
  },
  {
    id: "cohere",
    name: "Cohere",
    base: "https://api.cohere.com/compatibility/v1",
    access: "key",
    hint: "Ключ Cohere.",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    base: "https://api.perplexity.ai",
    modelsBase: "https://api.perplexity.ai/v1",
    access: "key",
    hint: "Ключ Perplexity.",
  },
  {
    id: "moonshot",
    name: "Moonshot",
    base: "https://api.moonshot.ai/v1",
    access: "key",
    hint: "Ключ Moonshot.",
  },
  {
    id: "custom",
    name: "Свой",
    base: "",
    access: "key",
    hint: "Любой OpenAI-совместимый адрес, без /chat/completions.",
  },
  {
    id: "local",
    name: "Локальная",
    base: "",
    access: "open",
    hint: "Адрес сервера в сети, без /chat/completions. Например http://192.168.1.10:11434/v1. На iPad модель не запускается. Ключ не обязателен.",
  },
];

export const MAX_STEPS = 100;

export interface AgentSettings {
  providers: Provider[];
  activeId: string;
  maxSteps: number;
}

export function freshSettings(): AgentSettings {
  return {
    providers: [{ id: "openai", name: "OpenAI", base: "https://api.openai.com/v1", key: "", model: "gpt-4o" }],
    activeId: "openai",
    maxSteps: 8,
  };
}

export function providerLabel(provider: Provider): string {
  const name = provider.name.trim();
  const generic = name === "" || name === "основной" || name === "OpenAI" || /^провайдер \d+$/.test(name);
  let host = "";
  try {
    host = new URL(provider.base).host;
  } catch {
    host = "";
  }
  if (generic && host) return host;
  if (name) return name;
  if (host) return host;
  return provider.id;
}

export function newProviderId(): string {
  if (typeof crypto.randomUUID !== "function") throw new Error("нет crypto.randomUUID");
  return crypto.randomUUID();
}

export function presetById(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((item) => item.id === id);
}

export function providerFromPreset(preset: ProviderPreset, id: string): Provider {
  const provider: Provider = {
    id,
    name: preset.name,
    base: preset.base,
    key: "",
    model: "",
    preset: preset.id,
  };
  if (preset.access === "open") provider.access = "open";
  if (preset.modelsBase) provider.modelsBase = preset.modelsBase;
  return provider;
}

export function providerNeedsKey(provider: Provider): boolean {
  return provider.access !== "open";
}

export function providerCanList(provider: Provider): boolean {
  if (!provider.base.trim()) return false;
  if (providerNeedsKey(provider) && !provider.key.trim()) return false;
  return true;
}

export function assignProviderBase(provider: Provider, base: string): void {
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

export function requestHeaders(provider: Provider, json: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const key = provider.key.trim();
  if (!key) {
    if (providerNeedsKey(provider)) throw new Error("укажи ключ");
    return headers;
  }
  headers.Authorization = "Bearer " + key;
  return headers;
}

export function chatCompletionsUrl(provider: Provider): string {
  return apiBase(provider) + "/chat/completions";
}

export function modelsEndpoint(provider: Provider): string {
  const base = apiBase(provider);
  const root = (provider.modelsBase?.trim() || base).replace(/\/$/, "");
  return root + "/models";
}

function apiBase(provider: Provider): string {
  const base = provider.base.trim().replace(/\/$/, "");
  if (!base) throw new Error("укажи адрес API");
  return base;
}

export function settingsFromSaved(saved: unknown): AgentSettings {
  if (!saved || typeof saved !== "object") return freshSettings();
  const data = saved as Record<string, unknown>;
  const maxSteps = readSteps(data.maxSteps);
  if ("providers" in data) {
    const providers = readProviders(data.providers);
    const activeId = typeof data.activeId === "string" ? data.activeId : "";
    return { providers, activeId, maxSteps };
  }
  if ("base" in data || "key" in data || "model" in data) {
    const provider: Provider = {
      id: "saved",
      name: "основной",
      base: typeof data.base === "string" ? data.base.trim() : "",
      key: typeof data.key === "string" ? data.key : "",
      model: typeof data.model === "string" ? data.model.trim() : "",
    };
    return { providers: [provider], activeId: provider.id, maxSteps };
  }
  return { ...freshSettings(), maxSteps };
}

function readSteps(value: unknown): number {
  if (value === undefined) return 8;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_STEPS) return value;
  throw new Error("шаги в настройках повреждены");
}

function readProviders(value: unknown): Provider[] {
  if (!Array.isArray(value)) throw new Error("список провайдеров повреждён");
  const ids = new Set<string>();
  return value.map((item) => {
    const provider = readProvider(item);
    if (ids.has(provider.id)) throw new Error("провайдеры с одинаковым id");
    ids.add(provider.id);
    return provider;
  });
}

function readProvider(item: unknown): Provider {
  if (!item || typeof item !== "object") throw new Error("провайдер повреждён");
  const row = item as Record<string, unknown>;
  if (typeof row.id !== "string" || !row.id.trim()) throw new Error("провайдер без id");
  if (typeof row.name !== "string") throw new Error("провайдер без имени");
  if (typeof row.base !== "string") throw new Error("провайдер без адреса");
  if (typeof row.key !== "string") throw new Error("провайдер без ключа");
  if (typeof row.model !== "string") throw new Error("провайдер без модели");
  const provider: Provider = {
    id: row.id.trim(),
    name: row.name.trim(),
    base: row.base.trim(),
    key: row.key,
    model: row.model.trim(),
  };
  if ("access" in row && row.access !== undefined) {
    if (row.access !== "key" && row.access !== "open") throw new Error("провайдер с неизвестным доступом");
    if (row.access === "open") provider.access = "open";
  }
  if ("modelsBase" in row && row.modelsBase !== undefined) {
    if (typeof row.modelsBase !== "string" || !row.modelsBase.trim()) throw new Error("провайдер с пустым адресом моделей");
    provider.modelsBase = row.modelsBase.trim();
  }
  if ("preset" in row && row.preset !== undefined) {
    if (typeof row.preset !== "string" || !row.preset.trim()) throw new Error("провайдер с пустой преднастройкой");
    provider.preset = row.preset.trim();
  }
  if ("timeout" in row && row.timeout !== undefined) {
    if (typeof row.timeout !== "number" || !Number.isInteger(row.timeout) || row.timeout < 1 || row.timeout > 3600) {
      throw new Error("таймаут провайдера повреждён");
    }
    provider.timeout = row.timeout;
  }
  return provider;
}
