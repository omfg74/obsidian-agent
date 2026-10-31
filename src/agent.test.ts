import assert from "node:assert/strict";
import test from "node:test";
import { readTurn, runAgent, systemPrompt, visibleToolResult } from "./agent.ts";
import { replaceOnce } from "./replace.ts";
import { dispatchTool, resolvePath, type VaultFs } from "./vault.ts";

test("открытая заметка названа в подсказке", () => {
  const prompt = systemPrompt("уг.md");
  assert.match(prompt, /Фокус: уг\.md/);
  assert.match(prompt, /другой файл не создавай/);
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
  };
  await assert.rejects(() => dispatchTool(fs, "view_image", { path: "кадр.heic" }), /png, jpeg, gif и webp/);
});
