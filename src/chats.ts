import type { ChatMessage, ContentPart, ToolCall } from "./agent.ts";
import { newProviderId } from "./settings.ts";

export type ChatLine = { kind: "user" | "assistant" | "tool" | "error"; text: string };

export interface Session {
  id: string;
  title: string;
  lines: ChatLine[];
  history: ChatMessage[];
  imagesOmitted: boolean;
  contextUsed: number | null;
}

export function newSession(): Session {
  return { id: newProviderId(), title: "чат", lines: [], history: [], imagesOmitted: false, contextUsed: null };
}

export function contextLabel(used: number, limit: number | null): string {
  const text = groupDigits(used);
  if (limit === null) return text;
  return text + " / " + groupDigits(limit);
}

/**
 * Размер контекста равен prompt + completion последнего запроса:
 * промпт уже содержит всю историю чата, накопление задваивало.
 */
export function nextContextUsed(usage: { prompt: number; completion: number }): number {
  return usage.prompt + usage.completion;
}

function groupDigits(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function sessionTitle(lines: ChatLine[]): string {
  const text = lines.find((line) => line.kind === "user")?.text.trim() ?? "";
  if (!text) return "чат";
  return text.length > 40 ? text.slice(0, 40) + "…" : text;
}

export function stripImages(history: ChatMessage[]): { history: ChatMessage[]; imagesOmitted: boolean } {
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

function textContent(parts: ContentPart[]): string | ContentPart[] {
  if (parts.length === 1 && parts[0].type === "text") return parts[0].text;
  return parts;
}

export function sessionsFromSaved(saved: unknown): { sessions: Session[]; sessionId: string } | null {
  if (!saved || typeof saved !== "object" || !("sessions" in saved)) return null;
  const data = saved as Record<string, unknown>;
  if (!Array.isArray(data.sessions)) throw new Error("список чатов повреждён");
  const ids = new Set<string>();
  const sessions = data.sessions.map((item) => {
    const session = readSession(item);
    if (ids.has(session.id)) throw new Error("чаты с одинаковым id");
    ids.add(session.id);
    return session;
  });
  const sessionId = typeof data.sessionId === "string" ? data.sessionId : "";
  return { sessions, sessionId };
}

function readSession(item: unknown): Session {
  if (!item || typeof item !== "object") throw new Error("чат повреждён");
  const row = item as Record<string, unknown>;
  if (typeof row.id !== "string" || !row.id.trim()) throw new Error("чат без id");
  if (typeof row.title !== "string") throw new Error("чат без названия");
  if (!Array.isArray(row.lines) || !Array.isArray(row.history)) throw new Error("чат повреждён");
  if (typeof row.imagesOmitted !== "boolean") throw new Error("чат повреждён");
  return {
    id: row.id.trim(),
    title: row.title.trim(),
    lines: row.lines.map(readLine),
    history: row.history.map(readMessage),
    imagesOmitted: row.imagesOmitted,
    contextUsed: readContextUsed(row.contextUsed),
  };
}

function readContextUsed(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new Error("чат повреждён");
  return value;
}

function readLine(item: unknown): ChatLine {
  if (!item || typeof item !== "object") throw new Error("строка чата повреждена");
  const row = item as Record<string, unknown>;
  if (row.kind !== "user" && row.kind !== "assistant" && row.kind !== "tool" && row.kind !== "error") throw new Error("строка чата повреждена");
  if (typeof row.text !== "string") throw new Error("строка чата повреждена");
  return { kind: row.kind, text: row.text };
}

function readMessage(item: unknown): ChatMessage {
  if (!item || typeof item !== "object") throw new Error("сообщение чата повреждено");
  const row = item as Record<string, unknown>;
  if (row.role !== "user" && row.role !== "assistant" && row.role !== "tool" && row.role !== "system") throw new Error("сообщение чата повреждено");
  const message: ChatMessage = { role: row.role, content: readContent(row.content) };
  if (row.tool_call_id !== undefined) {
    if (typeof row.tool_call_id !== "string" || !row.tool_call_id) throw new Error("сообщение чата повреждено");
    message.tool_call_id = row.tool_call_id;
  }
  if (row.tool_calls !== undefined) {
    if (!Array.isArray(row.tool_calls)) throw new Error("сообщение чата повреждено");
    message.tool_calls = row.tool_calls.map(readToolCall);
  }
  return message;
}

function readContent(value: unknown): ChatMessage["content"] {
  if (value === null || typeof value === "string") return value;
  if (!Array.isArray(value)) throw new Error("сообщение чата повреждено");
  return value.map((part) => {
    if (!part || typeof part !== "object") throw new Error("сообщение чата повреждено");
    const row = part as Record<string, unknown>;
    if (row.type !== "text" || typeof row.text !== "string") throw new Error("сообщение чата повреждено");
    return { type: "text", text: row.text };
  });
}

function readToolCall(item: unknown): ToolCall {
  if (!item || typeof item !== "object") throw new Error("вызов инструмента повреждён");
  const row = item as Record<string, unknown>;
  const fn = row.function;
  if (typeof row.id !== "string" || !row.id || !fn || typeof fn !== "object") throw new Error("вызов инструмента повреждён");
  const func = fn as Record<string, unknown>;
  if (typeof func.name !== "string" || typeof func.arguments !== "string") throw new Error("вызов инструмента повреждён");
  return { id: row.id, type: "function", function: { name: func.name, arguments: func.arguments } };
}
