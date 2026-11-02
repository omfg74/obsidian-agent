import assert from "node:assert/strict";
import test from "node:test";
import { readTurn, readTurnText, runAgent, systemPrompt, visibleToolResult } from "./agent.ts";
import { replaceOnce } from "./replace.ts";
import { dispatchTool, resolvePath, type VaultFs } from "./vault.ts";

test("открытая заметка названа в подсказке", () => {
  const prompt = systemPrompt("уг.md");
  assert.match(prompt, /Фокус: уг\.md/);
  assert.match(prompt, /другой файл не создавай/);
  assert.match(prompt, /create_folder/);
  assert.match(prompt, /читался с первого раза/);
  assert.match(prompt, /Содержание держи в заметке/);
});

test("replaceOnce меняет одно вхождение", () => {
  assert.equal(replaceOnce("абвгде", "абв", "я"), "ягде");
});

test("replaceOnce не трогает повтор", () => {
  assert.throws(() => replaceOnce("аа", "а", "б"), /больше одного раза/);
});

function memoryFs(): { fs: VaultFs; files: Map<string, string> } {
  const files = new Map<string, string>([["лекция.md", "Было так."]]);
  const images = new Map<string, Uint8Array>([["кадр.png", Uint8Array.from([1, 2, 3])]]);
  const fs: VaultFs = {
    async find(path) {
      if (files.has(path) || images.has(path)) return { path, folder: false };
      return null;
    },
    async findMany() {
      return [];
    },
    async read(path) {
      const text = files.get(path);
      if (text === undefined) throw new Error("нет");
      return text;
    },
    async write(path, content) {
      files.set(path, content);
    },
    async bytes(path) {
      const bytes = images.get(path);
      if (!bytes) throw new Error("нет");
      return bytes;
    },
    async children() {
      return [
        { path: "лекция.md", folder: false },
        { path: "кадр.png", folder: false },
      ];
    },
    async mkdir() {
      throw new Error("нельзя");
    },
  };
  return { fs, files };
}

test("агент смотрит картинку и правит текст", async () => {
  const { fs, files } = memoryFs();
  const seen: string[] = [];
  let step = 0;
  const messages = await runAgent({
    messages: [
      { role: "system", content: systemPrompt("лекция.md") },
      { role: "user", content: "посмотри кадр и поправь лекцию" },
    ],
    maxSteps: 6,
    post: async (history) => {
      step++;
      if (step === 1) {
        return {
          content: null,
          tool_calls: [{ id: "1", type: "function", function: { name: "view_image", arguments: JSON.stringify({ path: "кадр.png" }) } }],
        };
      }
      if (step === 2) {
        const last = history[history.length - 1];
        assert.equal(last.role, "user");
        assert.ok(Array.isArray(last.content));
        return {
          content: null,
          tool_calls: [{ id: "2", type: "function", function: { name: "search_replace", arguments: JSON.stringify({ path: "лекция.md", old: "Было так.", new: "Стало так." }) } }],
        };
      }
      return { content: "Готово." };
    },
    callTool: (name, args) => {
      seen.push(name);
      return dispatchTool(fs, name, args);
    },
  });
  assert.deepEqual(seen, ["view_image", "search_replace"]);
  assert.equal(files.get("лекция.md"), "Стало так.");
  assert.equal(messages[messages.length - 1].content, "Готово.");
});

test("ход показывает finish и длину аргумента", async () => {
  const lines: string[] = [];
  const content = "а".repeat(149);
  await runAgent({
    messages: [{ role: "user", content: "запиши" }],
    maxSteps: 2,
    onLine: (line) => lines.push(line),
    post: async () => {
      if (lines.length === 0) {
        return {
          content: null,
          finishReason: "tool_calls",
          tool_calls: [{ id: "1", type: "function", function: { name: "write_note", arguments: JSON.stringify({ path: "yr.md", content }) } }],
        };
      }
      return { content: "готово", finishReason: "stop" };
    },
    callTool: async () => ({ text: "записал yr.md, " + content.length + " символов" }),
  });
  assert.deepEqual(lines, [
    "finish: tool_calls",
    "инструмент write_note, аргумент " + JSON.stringify({ path: "yr.md", content }).length + " символов",
    "write_note: записал yr.md, 149 символов",
    "finish: stop",
  ]);
});

test("длинный результат инструмента в чат не копируется", () => {
  assert.equal(visibleToolResult("read_note", "а".repeat(241)), "read_note: 241 символов");
});

test("хвост со списанием не затирает текст платной модели", () => {
  const text = [
    'data: {"id":"gen","choices":[]}',
    'data: {"choices":[{"finish_reason":null,"delta":{"reasoning_content":"думаю"}}]}',
    'data: {"choices":[{"finish_reason":null,"delta":{"content":"Всё работает"}}]}',
    'data: {"choices":[{"finish_reason":"stop","delta":{}}]}',
    'data: {"choices":[],"usage":{"prompt_tokens":8,"completion_tokens":2}}',
    'data: {"choices":[],"cost":"0.01"}',
    "data: [DONE]",
  ].join("\n");
  const turn = readTurnText(text);
  assert.equal(turn.content, "Всё работает");
  assert.equal(turn.finishReason, "stop");
  assert.deepEqual(turn.usage, { prompt: 8, completion: 2 });
});

test("поздний кусок с ответом не затирает вход всего чата", () => {
  const text = [
    'data: {"choices":[{"finish_reason":null,"delta":{"content":"а"}}],"usage":{"prompt_tokens":5000}}',
    'data: {"choices":[{"finish_reason":"stop","delta":{}}],"usage":{"completion_tokens":2132}}',
    'data: {"choices":[],"usage":{"prompt_tokens":0,"completion_tokens":2132}}',
    "data: [DONE]",
  ].join("\n");
  const turn = readTurnText(text);
  assert.equal(turn.content, "а");
  assert.deepEqual(turn.usage, { prompt: 5000, completion: 2132 });
});

test("поток из одних пустых choices остаётся ошибкой", () => {
  assert.throws(() => readTurnText('data: {"choices":[],"cost":"0"}\ndata: [DONE]\n'), /в ответе нет сообщения/);
});

test("поток собирает текст, а рассуждение в ответ не попадает", () => {
  const text = [
    'data: {"choices":[{"finish_reason":null,"delta":{"reasoning_content":"думаю"}}]}',
    'data: {"choices":[{"finish_reason":null,"delta":{"content":"При"}}]}',
    'data: {"choices":[{"finish_reason":"stop","delta":{"content":"вет"}}]}',
    "data: [DONE]",
  ].join("\n");
  const turn = readTurnText(text);
  assert.equal(turn.content, "Привет");
  assert.equal(turn.finishReason, "stop");
  assert.equal(turn.tool_calls, undefined);
});

test("поток склеивает аргумент инструмента", () => {
  const text = [
    'data: {"choices":[{"finish_reason":null,"delta":{"tool_calls":[{"index":0,"id":"1","function":{"name":"read_note","arguments":""}}]}}]}',
    'data: {"choices":[{"finish_reason":"tool_calls","delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"path\\":\\"a.md\\"}"}}]}}]}',
    "data: [DONE]",
  ].join("\n");
  const turn = readTurnText(text);
  assert.equal(turn.finishReason, "tool_calls");
  assert.equal(turn.tool_calls?.[0].function.arguments, '{"path":"a.md"}');
});

test("целый json читается тем же разбором", () => {
  const turn = readTurnText(JSON.stringify({
    choices: [{ finish_reason: "stop", message: { content: "ок" } }],
    usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 },
  }));
  assert.equal(turn.content, "ок");
  assert.equal(turn.finishReason, "stop");
  assert.deepEqual(turn.usage, { prompt: 3, completion: 1 });
});

test("нет usage и битый usage не становятся нулём токенов", () => {
  const plain = readTurnText(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: "ок" } }] }));
  assert.equal(plain.usage, null);
  const broken = readTurnText(JSON.stringify({
    choices: [{ finish_reason: "stop", message: { content: "ок" } }],
    usage: { prompt_tokens: "много", completion_tokens: 1 },
  }));
  assert.equal(broken.content, "ок");
  assert.equal(broken.usage, null);
  const half = readTurnText(JSON.stringify({
    choices: [{ finish_reason: "stop", message: { content: "ок" } }],
    usage: { prompt_tokens: 4 },
  }));
  assert.equal(half.usage, null);
  const empty = readTurnText(JSON.stringify({
    choices: [{ finish_reason: "stop", message: { content: "ок" } }],
    usage: { prompt_tokens: 0, completion_tokens: 0 },
  }));
  assert.deepEqual(empty.usage, { prompt: 0, completion: 0 });
});

test("ошибка внутри потока не прячется", () => {
  assert.throws(() => readTurnText('data: {"error":{"message":"слот занят"}}\n'), /слот занят/);
  assert.throws(() => readTurnText("не поток"), /в ответе нет сообщения/);
});

test("finish_reason length остаётся как прислал провайдер", () => {
  const turn = readTurn({
    choices: [{ finish_reason: "length", message: { content: null, tool_calls: [{ id: "1", type: "function", function: { name: "write_note", arguments: "{" } }] } }],
  });
  assert.equal(turn.finishReason, "length");
  assert.equal(readTurn({ choices: [{ message: { content: "ок" } }] }).finishReason, null);
});

test("неоднозначный путь не выбирает файл сам", async () => {
  const fs: VaultFs = {
    async find() {
      return null;
    },
    async findMany() {
      return ["a/заметка.md", "b/заметка.md"];
    },
    async read() {
      throw new Error("нельзя");
    },
    async write() {
      throw new Error("нельзя");
    },
    async bytes() {
      throw new Error("нельзя");
    },
    async children() {
      return [];
    },
    async mkdir() {
      throw new Error("нельзя");
    },
  };
  await assert.rejects(() => resolvePath(fs, "заметка"), /несколько файлов/);
});

test("heic не отправляется модели", async () => {
  const fs: VaultFs = {
    async find(path) {
      return path === "кадр.heic" ? { path, folder: false } : null;
    },
    async findMany() {
      return [];
    },
    async read() {
      throw new Error("нельзя");
    },
    async write() {
      throw new Error("нельзя");
    },
    async bytes() {
      return Uint8Array.from([1]);
    },
    async children() {
      return [];
    },
    async mkdir() {
      throw new Error("нельзя");
    },
  };
  await assert.rejects(() => dispatchTool(fs, "view_image", { path: "кадр.heic" }), /png, jpeg, gif и webp/);
});

test("create_folder создаёт недостающих родителей и не затирает файл", async () => {
  const folders = new Set<string>();
  const files = new Set<string>(["заметка.md"]);
  const fs: VaultFs = {
    async find(path) {
      if (folders.has(path)) return { path, folder: true };
      if (files.has(path)) return { path, folder: false };
      return null;
    },
    async findMany() {
      return [];
    },
    async read() {
      throw new Error("нельзя");
    },
    async write() {
      throw new Error("нельзя");
    },
    async bytes() {
      throw new Error("нельзя");
    },
    async children() {
      return [];
    },
    async mkdir(path) {
      const slash = path.lastIndexOf("/");
      if (slash > 0 && !folders.has(path.slice(0, slash))) throw new Error("нет папки " + path.slice(0, slash));
      if (folders.has(path)) throw new Error("папка уже есть");
      if (files.has(path)) throw new Error("это файл: " + path);
      folders.add(path);
    },
  };
  const made = await dispatchTool(fs, "create_folder", { path: "/архив/2026/" });
  assert.equal(made.text, "создал папки архив, архив/2026");
  assert.deepEqual([...folders], ["архив", "архив/2026"]);
  const one = await dispatchTool(fs, "create_folder", { path: "архив/2026/май" });
  assert.equal(one.text, "создал папку архив/2026/май");
  await assert.rejects(() => dispatchTool(fs, "create_folder", { path: "архив/2026" }), /папка уже есть/);
  await assert.rejects(() => dispatchTool(fs, "create_folder", { path: "заметка.md" }), /это файл: заметка.md/);
  await assert.rejects(() => dispatchTool(fs, "create_folder", { path: "заметка.md/внутри" }), /это файл: заметка.md/);
  await assert.rejects(() => dispatchTool(fs, "create_folder", { path: ".obsidian/plugins" }), /такой путь создать нельзя/);
  await assert.rejects(() => dispatchTool(fs, "create_folder", { path: "архив/../секрет" }), /такой путь создать нельзя/);
  await assert.rejects(() => dispatchTool(fs, "create_folder", { path: "архив//черновик" }), /такой путь создать нельзя/);
  await assert.rejects(() => dispatchTool(fs, "create_folder", { path: "" }), /такой путь создать нельзя/);
});
