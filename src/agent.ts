export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[] | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

export type ToolImage = { mime: string; base64: string };

export type ToolOutput = { text: string; image?: ToolImage };

export type ToolHandler = (name: string, args: Record<string, unknown>) => Promise<ToolOutput>;

export type TokenUsage = { prompt: number; completion: number };

export type AssistantTurn = { content: string | null; tool_calls?: ToolCall[]; finishReason: string | null; usage: TokenUsage | null };

export const TOOLS = [
  {
    type: "function",
    function: {
      name: "read_note",
      description: "Прочитать текстовый файл хранилища.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "Путь от корня хранилища" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_folder",
      description: "Список файлов и папок. Пустой path — корень.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_folder",
      description: "Создать папку. Недостающие родительские папки тоже создаёт.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "Путь от корня хранилища" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "view_image",
      description: "Посмотреть картинку png, jpeg, gif или webp из хранилища.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_replace",
      description: "Заменить один точный фрагмент в файле. old должен встретиться ровно один раз.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          old: { type: "string" },
          new: { type: "string" },
        },
        required: ["path", "old", "new"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_note",
      description: "Записать файл целиком. Создаёт, если его не было. Для маленькой правки используй search_replace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
];

export function systemPrompt(activePath: string): string {
  const where = activePath
    ? "Фокус: " + activePath + ". «Этот файл», «эта заметка» и «здесь» — это он. Такой запрос правь в нём, другой файл не создавай."
    : "Фокус не выбран. Не выдумывай путь к файлу.";
  return [
    "Ты агент внутри Obsidian. Хранилище смотри только инструментами, не выдумывай текст файлов и картинок.",
    "Картинку сначала открой через view_image. Маленькую правку делай через search_replace.",
    "write_note переписывает файл целиком и не создаёт папку. Новую папку создай через create_folder: недостающие родители он создаёт сам.",
    where,
  ].join("\n");
}

const VISIBLE_TOOL = 240;

export function visibleToolResult(name: string, text: string): string {
  if (text.length <= VISIBLE_TOOL) return name + ": " + text;
  return name + ": " + text.length + " символов";
}

export function readTurn(body: unknown): AssistantTurn {
  if (!body || typeof body !== "object") throw new Error("в ответе нет сообщения");
  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") throw new Error("в ответе нет сообщения");
  const choice = choices[0] as { finish_reason?: unknown; message?: unknown };
  if (!choice.message || typeof choice.message !== "object") throw new Error("в ответе нет сообщения");
  const message = choice.message as { content?: string | null; tool_calls?: ToolCall[] };
  const reason = choice.finish_reason;
  return {
    content: message.content ?? null,
    tool_calls: message.tool_calls,
    finishReason: typeof reason === "string" && reason.trim() ? reason : null,
    usage: readUsage((body as { usage?: unknown }).usage),
  };
}

function readUsage(value: unknown): TokenUsage | null {
  const part = readUsagePart(value);
  if (!part || part.prompt === null || part.completion === null) return null;
  return { prompt: part.prompt, completion: part.completion };
}

function readUsagePart(value: unknown): { prompt: number | null; completion: number | null } | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const hasPrompt = "prompt_tokens" in row;
  const hasCompletion = "completion_tokens" in row;
  if (!hasPrompt && !hasCompletion) return null;
  const prompt = hasPrompt ? tokenCount(row.prompt_tokens) : null;
  const completion = hasCompletion ? tokenCount(row.completion_tokens) : null;
  if (hasPrompt && prompt === null) return null;
  if (hasCompletion && completion === null) return null;
  return { prompt, completion };
}

function tokenCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
  return value;
}

export function readTurnText(text: string): AssistantTurn {
  const body = text.trim();
  if (!body) throw new Error("в ответе нет сообщения");
  if (body.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error("в ответе нет сообщения");
    }
    return readTurn(parsed);
  }
  return readEventStream(body);
}

function readEventStream(text: string): AssistantTurn {
  let content: string | null = null;
  let finishReason: string | null = null;
  let sawChoice = false;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  const calls = new Map<number, { id: string; name: string; arguments: string }>();
  for (const rawLine of text.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload) throw new Error("в ответе нет сообщения");
    if (payload === "[DONE]") break;
    let event: unknown;
    try {
      event = JSON.parse(payload);
    } catch {
      throw new Error("в ответе нет сообщения");
    }
    if (!event || typeof event !== "object") throw new Error("в ответе нет сообщения");
    const row = event as { error?: unknown; choices?: unknown; usage?: unknown };
    const part = readUsagePart(row.usage);
    if (part?.prompt != null) promptTokens = Math.max(promptTokens ?? 0, part.prompt);
    if (part?.completion != null) completionTokens = Math.max(completionTokens ?? 0, part.completion);
    if ("error" in row && row.error != null) throw new Error(streamError(row.error));
    if (!("choices" in row)) continue;
    if (!Array.isArray(row.choices)) throw new Error("в ответе нет сообщения");
    if (row.choices.length === 0) continue;
    if (!row.choices[0] || typeof row.choices[0] !== "object") throw new Error("в ответе нет сообщения");
    sawChoice = true;
    const choice = row.choices[0] as { finish_reason?: unknown; delta?: unknown };
    if (typeof choice.finish_reason === "string" && choice.finish_reason.trim()) finishReason = choice.finish_reason;
    if (!choice.delta || typeof choice.delta !== "object") continue;
    const delta = choice.delta as { content?: unknown; tool_calls?: unknown };
    if ("content" in delta && delta.content != null) {
      if (typeof delta.content !== "string") throw new Error("в ответе нет сообщения");
      content = (content ?? "") + delta.content;
    }
    if ("tool_calls" in delta && delta.tool_calls != null) appendToolDeltas(calls, delta.tool_calls);
  }
  if (!sawChoice) throw new Error("в ответе нет сообщения");
  const tool_calls = [...calls.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, call]) => ({ id: call.id, type: "function" as const, function: { name: call.name, arguments: call.arguments } }));
  const usage = promptTokens === null || completionTokens === null ? null : { prompt: promptTokens, completion: completionTokens };
  return { content, tool_calls: tool_calls.length > 0 ? tool_calls : undefined, finishReason, usage };
}

function streamError(error: unknown): string {
  if (!error || typeof error !== "object" || !("message" in error)) throw new Error("в ответе нет сообщения");
  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string" || !message.trim()) throw new Error("в ответе нет сообщения");
  return message;
}

function appendToolDeltas(calls: Map<number, { id: string; name: string; arguments: string }>, value: unknown) {
  if (!Array.isArray(value)) throw new Error("в ответе нет сообщения");
  for (const item of value) {
    if (!item || typeof item !== "object") throw new Error("в ответе нет сообщения");
    const row = item as { index?: unknown; id?: unknown; function?: unknown };
    if (typeof row.index !== "number") throw new Error("в ответе нет сообщения");
    const current = calls.get(row.index) ?? { id: "", name: "", arguments: "" };
    if ("id" in row && row.id != null) {
      if (typeof row.id !== "string" || !row.id) throw new Error("в ответе нет сообщения");
      current.id = row.id;
    }
    if ("function" in row && row.function != null) {
      if (!row.function || typeof row.function !== "object") throw new Error("в ответе нет сообщения");
      const fn = row.function as { name?: unknown; arguments?: unknown };
      if ("name" in fn && fn.name != null) {
        if (typeof fn.name !== "string" || !fn.name) throw new Error("в ответе нет сообщения");
        current.name = fn.name;
      }
      if ("arguments" in fn && fn.arguments != null) {
        if (typeof fn.arguments !== "string") throw new Error("в ответе нет сообщения");
        current.arguments += fn.arguments;
      }
    }
    calls.set(row.index, current);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("аргументы инструмента не объект");
  }
  return value as Record<string, unknown>;
}

export async function runAgent(input: {
  messages: ChatMessage[];
  post: (messages: ChatMessage[]) => Promise<AssistantTurn>;
  callTool: ToolHandler;
  maxSteps: number;
  shouldStop?: () => boolean;
  onLine?: (line: string) => void;
}): Promise<ChatMessage[]> {
  const messages = input.messages;
  for (let step = 0; step < input.maxSteps; step++) {
    if (input.shouldStop?.()) throw new Error("остановлено");
    const turn = await input.post(messages);
    input.onLine?.("finish: " + (turn.finishReason ?? "нет"));
    const calls = turn.tool_calls ?? [];
    if (calls.length === 0) {
      messages.push({ role: "assistant", content: turn.content ?? "" });
      return messages;
    }
    messages.push({ role: "assistant", content: turn.content, tool_calls: calls });
    for (const call of calls) {
      if (input.shouldStop?.()) throw new Error("остановлено");
      if (!call.id) throw new Error("модель прислала вызов без id");
      const name = call.function?.name || "";
      const raw = call.function?.arguments;
      input.onLine?.("инструмент " + name + ", аргумент " + (typeof raw === "string" ? raw.length + " символов" : "не строка"));
      let output: ToolOutput;
      try {
        const args = asRecord(JSON.parse(call.function?.arguments || "{}"));
        output = await input.callTool(name, args);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output = { text: "ошибка: " + message };
      }
      input.onLine?.(visibleToolResult(name, output.text));
      messages.push({ role: "tool", tool_call_id: call.id, content: output.text });
      if (output.image) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: output.text },
            { type: "image_url", image_url: { url: "data:" + output.image.mime + ";base64," + output.image.base64 } },
          ],
        });
      }
    }
  }
  throw new Error("лимит шагов: " + input.maxSteps);
}
