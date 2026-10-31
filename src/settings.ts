export interface Provider {
  id: string;
  name: string;
  base: string;
  key: string;
  model: string;
}

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

export function newProviderId(): string {
  if (typeof crypto.randomUUID !== "function") throw new Error("нет crypto.randomUUID");
  return crypto.randomUUID();
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
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 30) return value;
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
  return {
    id: row.id.trim(),
    name: row.name.trim(),
    base: row.base.trim(),
    key: row.key,
    model: row.model.trim(),
  };
}
