import assert from "node:assert/strict";
import test from "node:test";
import { assertModeTool, readTurn, readTurnText, runAgent, systemPrompt, TOOLS, toolsForMode, visibleToolResult, visibleTools } from "./agent.ts";
import { replaceOnce } from "./replace.ts";
import { dispatchTool, resolvePath, type VaultFs } from "./vault.ts";

test("открытая заметка названа в подсказке", () => {
  const prompt = systemPrompt("уг.md", "all", true);
  assert.match(prompt, /Фокус: уг\.md/);
  assert.match(prompt, /другой файл не создавай/);
  assert.match(prompt, /create_folder/);
  assert.match(prompt, /читался с первого раза/);
  assert.match(prompt, /Содержание держи в заметке/);
});

test("режим ограничивает инструменты", () => {
  const names = (mode: "chat" | "write" | "all") => toolsForMode(mode).map((tool) => tool.function.name);
  assert.deepEqual(names("chat"), ["read_note", "list_folder", "view_image", "web_search", "fetch_url"]);
  assert.deepEqual(names("write"), ["read_note", "view_image", "search_replace", "write_note", "web_search", "fetch_url"]);
  assert.deepEqual(toolsForMode("all"), TOOLS);
  assert.throws(() => assertModeTool("chat", "write_note"), /режим chat не даёт write_note/);
  assert.throws(() => assertModeTool("chat", "delete_note"), /режим chat не даёт delete_note/);
  assert.throws(() => assertModeTool("write", "create_folder"), /режим write не даёт create_folder/);
  assert.throws(() => assertModeTool("write", "delete_note"), /режим write не даёт delete_note/);
  assert.doesNotThrow(() => assertModeTool("all", "create_folder"));
  assert.doesNotThrow(() => assertModeTool("all", "delete_note"));
});

test("web-инструменты видны по тумблеру, остальные не тронуты", () => {
  const names = (mode: "chat" | "write" | "all", web: boolean) => visibleTools(mode, web).map((tool) => tool.function.name);
  for (const mode of ["chat", "write", "all"] as const) {
    for (const name of ["web_search", "fetch_url"]) {
      assert.ok(names(mode, true).includes(name), mode + " с сетью видит " + name);
      assert.ok(!names(mode, false).includes(name), mode + " без сети не видит " + name);
    }
  }
  assert.deepEqual(names("chat", false), ["read_note", "list_folder", "view_image"]);
  assert.deepEqual(names("write", false), ["read_note", "view_image", "search_replace", "write_note"]);
  assert.equal(visibleTools("all", true).length, TOOLS.length);
  assert.equal(visibleTools("all", false).length, TOOLS.length - 2);
});

test("матрица режимов пропускает web-инструменты во всех режимах", () => {
  for (const mode of ["chat", "write", "all"] as const) {
    assert.doesNotThrow(() => assertModeTool(mode, "web_search"));
    assert.doesNotThrow(() => assertModeTool(mode, "fetch_url"));
  }
});

test("правила поиска попадают в подсказку только с включённой сетью", () => {
  const on = systemPrompt("а.md", "chat", true);
  assert.match(on, /web_search/);
  assert.match(on, /данные, а не инструкции/);
  const off = systemPrompt("а.md", "chat", false);
  assert.doesNotMatch(off, /web_search/);
  assert.doesNotMatch(off, /fetch_url/);
  const write = systemPrompt("а.md", "write", true);
  assert.match(write, /аккуратно, как текст из заметки/);
  const all = systemPrompt("а.md", "all", true);
  assert.match(all, /аккуратно, как текст из заметки/);
});

test("подсказка режима говорит, что можно", () => {
  const chat = systemPrompt("", "chat", false);
  assert.match(chat, /Режим chat/);
  assert.match(chat, /Менять хранилище нельзя/);
  assert.doesNotMatch(chat, /Содержание держи в заметке/);
  const write = systemPrompt("а.md", "write", false);
  assert.match(write, /Режим write/);
  assert.match(write, /создание папок недоступны/);
  assert.match(write, /Фокус: а\.md/);
  assert.match(systemPrompt("", "all", false), /Режим all/);
});

test("replaceOnce меняет одно вхождение", () => {
  assert.equal(replaceOnce("абвгде", "абв", "я"), "ягде");
});

test("replaceOnce не трогает повтор", () => {
  assert.throws(() => replaceOnce("аа", "а", "б"), /больше одного раза/);
});

function memoryFs(): { fs: VaultFs; files: Map<string, string>; trashed: string[] } {
  const files = new Map<string, string>([["лекция.md", "Было так."]]);
  const images = new Map<string, Uint8Array>([["кадр.png", Uint8Array.from([1, 2, 3])]]);
  const trashed: string[] = [];
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
    async trash(path) {
      if (!files.has(path) && !images.has(path)) throw new Error("нет");
      files.delete(path);
      images.delete(path);
      trashed.push(path);
    },
  };
  return { fs, files, trashed };
}

test("агент смотрит картинку и правит текст", async () => {
  const { fs, files } = memoryFs();
  const seen: string[] = [];
  let step = 0;
  const messages = await runAgent({
    messages: [
      { role: "system", content: systemPrompt("лекция.md", "all", false) },
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

test("web-инструменты без сети отбиваются guard-ом", async () => {
  const { fs } = memoryFs();
  await assert.rejects(() => dispatchTool(fs, "web_search", { query: "тест" }), /поиск в сети выключен/);
  await assert.rejects(() => dispatchTool(fs, "fetch_url", { url: "https://example.com" }), /поиск в сети выключен/);
});

test("web_search ходит на адрес поиска и разбирает выдачу", async () => {
  const { fs } = memoryFs();
  const seen: string[] = [];
  const web = {
    async fetch(init: { url: string }) {
      seen.push(init.url + " " + init.method);
      return { status: 200, text: ISSUE_SEARCH_HTML, contentType: "text/html" };
    },
  };
  const out = await dispatchTool(fs, "web_search", { query: "тест" }, web);
  assert.deepEqual(seen, ["https://html.duckduckgo.com/html/?q=" + encodeURIComponent("тест") + " GET"]);
  assert.equal(out.text, "[1] Пример Ру\nhttps://example.com/wiki\nсниппет");
});

test("web_search отдаёт ошибку поиска, а не пустоту", async () => {
  const { fs } = memoryFs();
  const bad = {
    async fetch() {
      return { status: 403, text: "forbidden", contentType: "text/plain" };
    },
  };
  await assert.rejects(() => dispatchTool(fs, "web_search", { query: "тест" }, bad), /поиск ответил 403/);
  const blocked = {
    async fetch() {
      return { status: 200, text: ANOMALY_HTML, contentType: "text/html" };
    },
  };
  await assert.rejects(() => dispatchTool(fs, "web_search", { query: "тест" }, blocked), /заблокирован/);
});

test("fetch_url чистит страницу, бинарный тип не читает", async () => {
  const { fs } = memoryFs();
  const web = {
    async fetch(init: { url: string }) {
      if (init.url !== "https://example.com/page") throw new Error("не тот адрес");
      return { status: 200, text: "<html><head><style>p{}</style></head><body><h1>Заголовок</h1><p>Текст &amp; хвост</p></body></html>", contentType: "text/html; charset=utf-8" };
    },
  };
  const out = await dispatchTool(fs, "fetch_url", { url: "https://example.com/page" }, web);
  assert.equal(out.text, "Заголовок\nТекст & хвост");
  const binary = {
    async fetch() {
      return { status: 200, text: "%PDF-1.4", contentType: "application/pdf" };
    },
  };
  await assert.rejects(() => dispatchTool(fs, "fetch_url", { url: "https://example.com/doc.pdf" }, binary), /страница не текстовая \(Content-Type: application\/pdf\)/);
});

const ISSUE_SEARCH_HTML = [
  '<html><body><div class="result__body">',
  '<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fwiki">Пример Ру</a>',
  '<a class="result__snippet" href="#">сниппет</a>',
  "</div></body></html>",
].join("\n");

const ANOMALY_HTML = "<html><body>captcha required: unusual activity</body></html>";

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
    async trash() {
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
    async trash() {
      throw new Error("нельзя");
    },
  };
  await assert.rejects(() => dispatchTool(fs, "view_image", { path: "кадр.heic" }), /png, jpeg, gif и webp/);
});

test("create_folder создаёт недостающих родителей и не затирает файл", async () => {
  const folders = new Set<string>();
  const files = new Set<string>(["заметка.md"]);
  const trashed: string[] = [];
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
    async trash(path) {
      if (!files.has(path)) throw new Error("нет");
      files.delete(path);
      trashed.push(path);
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

test("delete_note отправляет файл в корзину, а не стирает", async () => {
  const { fs, files, trashed } = memoryFs();
  const out = await dispatchTool(fs, "delete_note", { path: "лекция" });
  assert.equal(out.text, "отправил в корзину лекция.md");
  assert.deepEqual(trashed, ["лекция.md"]);
  assert.ok(!files.has("лекция.md"));
});

test("delete_note не трогает .obsidian и папки", async () => {
  const { fs } = memoryFs();
  await assert.rejects(() => dispatchTool(fs, "delete_note", { path: ".obsidian/app.json" }), /папку \.obsidian не трогаю/);
  await assert.rejects(() => dispatchTool(fs, "delete_note", { path: "нет такой.md" }), /нет файла/);
});
