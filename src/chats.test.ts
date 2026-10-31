import assert from "node:assert/strict";
import test from "node:test";
import type { ChatMessage } from "./agent.ts";
import { sessionTitle, sessionsFromSaved, stripImages } from "./chats.ts";

test("название чата берётся из первой реплики", () => {
  assert.equal(sessionTitle([{ kind: "user", text: "поправь лекцию" }]), "поправь лекцию");
  assert.equal(sessionTitle([]), "новый чат");
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
});
