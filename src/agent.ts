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

export type AssistantTurn = { content: string | null; tool_calls?: ToolCall[]; finishReason: string | null };

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
    "write_note переписывает файл целиком.",
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
  };
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
