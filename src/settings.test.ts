import assert from "node:assert/strict";
import test from "node:test";
import { providerLabel, settingsFromSaved } from "./settings.ts";

test("служебное имя провайдера показывается как адрес", () => {
  assert.equal(providerLabel({ id: "saved", name: "основной", base: "https://api.openai.com/v1", key: "", model: "" }), "api.openai.com");
  assert.equal(providerLabel({ id: "a", name: "домашний", base: "https://api.openai.com/v1", key: "", model: "" }), "домашний");
});

test("старые настройки становятся одним провайдером", () => {
  const settings = settingsFromSaved({ base: "https://api.example/v1", key: "secret", model: "gpt-4o", maxSteps: 4 });
  assert.equal(settings.providers.length, 1);
  assert.equal(settings.providers[0].base, "https://api.example/v1");
  assert.equal(settings.providers[0].key, "secret");
  assert.equal(settings.providers[0].model, "gpt-4o");
  assert.equal(settings.activeId, settings.providers[0].id);
  assert.equal(settings.maxSteps, 4);
});

test("несколько провайдеров читаются как есть", () => {
  const settings = settingsFromSaved({
    activeId: "b",
    maxSteps: 8,
    providers: [
      { id: "a", name: "OpenAI", base: "https://api.openai.com/v1", key: "k1", model: "gpt-4o" },
      { id: "b", name: "другой", base: "https://example/v1", key: "k2", model: "m" },
    ],
  });
  assert.deepEqual(settings.providers.map((item) => item.id), ["a", "b"]);
  assert.equal(settings.activeId, "b");
});

test("чужой activeId не подменяется первым провайдером", () => {
  const settings = settingsFromSaved({
    activeId: "нет",
    providers: [{ id: "a", name: "OpenAI", base: "https://api.openai.com/v1", key: "", model: "gpt-4o" }],
  });
  assert.equal(settings.activeId, "нет");
});

test("пустой список провайдеров не заполняется сам", () => {
  const settings = settingsFromSaved({ providers: [], activeId: "" });
  assert.deepEqual(settings.providers, []);
});

test("битый провайдер не превращается в рабочий", () => {
  assert.throws(() => settingsFromSaved({ providers: [{ id: "a" }] }), /повреждён|без /);
  assert.throws(() => settingsFromSaved({
    providers: [
      { id: "a", name: "A", base: "", key: "", model: "" },
      { id: "a", name: "B", base: "", key: "", model: "" },
    ],
  }), /одинаковым id/);
});
