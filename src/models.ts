export interface ListedModel {
  id: string;
  pay: "free" | "paid" | null;
  images: boolean | null;
  context: number | null;
}

const PRICE_KEYS = ["prompt", "completion", "input", "output", "request", "image", "hourly", "audio"];
const CONTEXT_KEYS = ["context_length", "context_window", "max_context_length"] as const;

export function listedModels(body: unknown): ListedModel[] {
  if (!body || typeof body !== "object" || !("data" in body)) throw new Error("в ответе нет списка моделей");
  const data = (body as { data: unknown }).data;
  if (!Array.isArray(data)) throw new Error("в ответе нет списка моделей");
  if (data.length === 0) throw new Error("провайдер не вернул ни одной модели");
  const models: ListedModel[] = [];
  const seen = new Set<string>();
  let foreign = 0;
  for (const item of data) {
    if (!item || typeof item !== "object") throw new Error("в списке моделей есть запись без id");
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string") throw new Error("в списке моделей есть запись без id");
    const id = row.id.trim();
    if (!id) throw new Error("в списке моделей есть запись без id");
    if (!chatCompletionsModel(row)) {
      foreign++;
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    models.push({ id, pay: payOf(row), images: imagesOf(row), context: contextOf(row) });
  }
  if (models.length === 0) {
    throw new Error(foreign > 0 ? "в списке нет моделей с chat completions" : "провайдер не вернул ни одной модели");
  }
  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}

function chatCompletionsModel(row: Record<string, unknown>): boolean {
  if (!("api" in row) || row.api == null) return true;
  if (typeof row.api !== "object" || Array.isArray(row.api)) return true;
  return "chat-completions" in row.api;
}

export function modelNotes(model: ListedModel): string {
  const notes: string[] = [];
  if (model.pay === "free") notes.push("бесплатно");
  if (model.pay === "paid") notes.push("платно");
  if (model.images === true) notes.push("картинки");
  if (model.images === false) notes.push("без картинок");
  return notes.join(" · ");
}

export function modelMenuLabel(model: ListedModel): string {
  const notes = modelNotes(model);
  if (!notes) return model.id;
  return notes + " · " + model.id;
}

function payOf(row: Record<string, unknown>): "free" | "paid" | null {
  if ("pricing" in row && row.pricing != null) return priceTable(row.pricing);
  if ("cost" in row && row.cost != null) return textCost(row.cost);
  return null;
}

function priceTable(pricing: unknown): "free" | "paid" | null {
  if (pricing === undefined || pricing === null) return null;
  if (typeof pricing !== "object" || Array.isArray(pricing)) return null;
  const row = pricing as Record<string, unknown>;
  const numbers = new Map<string, number>();
  for (const key of PRICE_KEYS) {
    if (!(key in row)) continue;
    const price = priceNumber(row[key]);
    if (price === null) return null;
    numbers.set(key, price);
  }
  const tokens =
    (numbers.has("prompt") && numbers.has("completion")) ||
    (numbers.has("input") && numbers.has("output"));
  if (!tokens) return null;
  for (const price of numbers.values()) {
    if (price > 0) return "paid";
  }
  return "free";
}

function textCost(cost: unknown): "free" | "paid" | null {
  if (!cost || typeof cost !== "object" || Array.isArray(cost)) return null;
  const text = (cost as Record<string, unknown>).text;
  if (!text || typeof text !== "object" || Array.isArray(text)) return null;
  const row = text as Record<string, unknown>;
  const input = nestedPrice(row.input);
  const output = nestedPrice(row.output);
  if (input === null || output === null) return null;
  if (input > 0 || output > 0) return "paid";
  return "free";
}

function nestedPrice(value: unknown): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return priceNumber((value as Record<string, unknown>).price);
}

function priceNumber(value: unknown): number | null {
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

function contextOf(row: Record<string, unknown>): number | null {
  const values: number[] = [];
  for (const key of CONTEXT_KEYS) {
    if (!(key in row) || row[key] == null) continue;
    const value = contextLength(row[key]);
    if (value === null) return null;
    values.push(value);
  }
  if (values.length === 0) return null;
  const [first] = values;
  if (values.some((value) => value !== first)) return null;
  return first;
}

function contextLength(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return null;
  return value;
}

function imagesOf(row: Record<string, unknown>): boolean | null {
  const architecture = row.architecture;
  if (architecture && typeof architecture === "object" && !Array.isArray(architecture)) {
    const spec = architecture as Record<string, unknown>;
    if ("input_modalities" in spec) return modalitiesReadImages(spec.input_modalities);
    if (typeof spec.modality === "string") return modalityReadsImages(spec.modality);
  }
  const modalities = mimeModalitiesReadImages(row.modalities);
  if (modalities !== null) return modalities;
  if (typeof row.supports_vision === "boolean") return row.supports_vision;
  if (typeof row.vision === "boolean") return row.vision;
  return null;
}

function mimeModalitiesReadImages(modalities: unknown): boolean | null {
  if (!modalities || typeof modalities !== "object" || Array.isArray(modalities)) return null;
  const input = (modalities as Record<string, unknown>).input;
  if (!Array.isArray(input) || input.length === 0) return null;
  let image = false;
  for (const item of input) {
    if (typeof item !== "string" || !item.trim()) return null;
    const name = item.trim().toLowerCase();
    if (name === "image" || name.startsWith("image/")) image = true;
  }
  return image;
}

function modalitiesReadImages(value: unknown): boolean | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const names: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) return null;
    names.push(item.trim().toLowerCase());
  }
  return names.includes("image");
}

function modalityReadsImages(modality: string): boolean | null {
  const arrow = modality.indexOf("->");
  if (arrow < 0) return null;
  const input = modality.slice(0, arrow).trim().toLowerCase();
  if (!input) return null;
  const parts = input.split("+").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.includes("image");
}
