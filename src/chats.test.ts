import assert from "node:assert/strict";
import test from "node:test";
import type { ChatMessage } from "./agent.ts";
import { contextLabel, nextContextUsed, sessionTitle, sessionsFromSaved, stripImages } from "./chats.ts";

test("название чата берётся из первой реплики", () => {
  assert.equal(sessionTitle([{ kind: "user", text: "поправь лекцию" }]), "поправь лекцию");
  assert.equal(sessionTitle([]), "чат");
});

test("картинка не остаётся в сохранённом контексте", () => {
  const history: ChatMessage[] = [{
    role: "user",
    content: [
      { type: "text", text: "картинка кадр.png" },
      { type: "image_url", image_url: { url: "data:image/png;base64,aaaa" } },
    ],
  }];
  const stored = stripImages(history);
  assert.equal(stored.imagesOmitted, true);
  assert.deepEqual(stored.history[0].content, "картинка кадр.png");
  assert.deepEqual(history[0].content, [
    { type: "text", text: "картинка кадр.png" },
    { type: "image_url", image_url: { url: "data:image/png;base64,aaaa" } },
  ]);
});

test("битый чат не превращается в пустой", () => {
  assert.equal(sessionsFromSaved({}), null);
  assert.throws(() => sessionsFromSaved({ sessions: [{ id: "a" }] }), /чат/);
  const saved = sessionsFromSaved({
    sessionId: "нет",
    sessions: [{ id: "a", title: "лекция", lines: [], history: [], imagesOmitted: false }],
  });
  assert.equal(saved?.sessionId, "нет");
  assert.equal(saved?.sessions.length, 1);
  assert.equal(saved?.sessions[0].contextUsed, null);
});

test("сохранённый размер контекста читается, битый не обнуляется", () => {
  const saved = sessionsFromSaved({
    sessionId: "a",
    sessions: [{ id: "a", title: "лекция", lines: [], history: [], imagesOmitted: false, contextUsed: 1200 }],
  });
  assert.equal(saved?.sessions[0].contextUsed, 1200);
  assert.throws(() => sessionsFromSaved({
    sessions: [{ id: "a", title: "лекция", lines: [], history: [], imagesOmitted: false, contextUsed: "1200" }],
  }), /чат повреждён/);
});

test("счётчик показывает размер последнего запроса, а не накапливает", () => {
  assert.equal(nextContextUsed({ prompt: 400, completion: 20 }), 420);
  assert.equal(nextContextUsed({ prompt: 500, completion: 30 }), 530);
  // на раздутом значении счётчик всё равно возвращается к реальному размеру
  assert.equal(nextContextUsed({ prompt: 5100, completion: 100 }), 5200);
});

test("подпись счётчика группирует тысячи и не выдумывает окно", () => {
  assert.equal(contextLabel(8300, 128000), "8 300 / 128 000");
  assert.equal(contextLabel(8300, null), "8 300");
  assert.equal(contextLabel(12, null), "12");
});
