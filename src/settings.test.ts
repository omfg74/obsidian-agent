import assert from "node:assert/strict";
import test from "node:test";
import { assignProviderBase, chatCompletionsUrl, modelsEndpoint, presetById, providerFromPreset, providerLabel, providerNeedsKey, requestHeaders, settingsFromSaved } from "./settings.ts";

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

test("преднастройки OpenCode и OpenRouter подставляют адрес, свой и локальный — нет", () => {
  const opencodePreset = presetById("opencode");
  const openrouterPreset = presetById("openrouter");
  const customPreset = presetById("custom");
  const localPreset = presetById("local");
  if (!opencodePreset || !openrouterPreset || !customPreset || !localPreset) throw new Error("нет преднастройки");
  const opencode = providerFromPreset(opencodePreset, "1");
  const openrouter = providerFromPreset(openrouterPreset, "2");
  const custom = providerFromPreset(customPreset, "3");
  const local = providerFromPreset(localPreset, "4");
  assert.equal(opencode.base, "https://opencode.ai/inference/openai/v1");
  assert.equal(opencode.modelsBase, "https://opencode.ai/inference/v1");
  assert.equal(modelsEndpoint(opencode), "https://opencode.ai/inference/v1/models");
  assert.equal(chatCompletionsUrl(opencode), "https://opencode.ai/inference/openai/v1/chat/completions");
  assert.equal(providerNeedsKey(opencode), true);
  assert.equal(openrouter.base, "https://openrouter.ai/api/v1");
  assert.equal(modelsEndpoint(openrouter), "https://openrouter.ai/api/v1/models");
  assert.equal(custom.base, "");
  assert.equal(custom.access, undefined);
  assert.equal(local.base, "");
  assert.equal(local.access, "open");
  assert.equal(providerNeedsKey(local), false);
  assert.deepEqual(requestHeaders(local, false), {});
  local.key = "secret";
  assert.deepEqual(requestHeaders(local, true), { "Content-Type": "application/json", Authorization: "Bearer secret" });
  assert.throws(() => requestHeaders(custom, false), /ключ/);
});

test("остальные облачные преднастройки указывают на chat completions", () => {
  const ids = ["anthropic", "cerebras", "fireworks", "sambanova", "huggingface", "nvidia", "minimax", "cohere", "moonshot"];
  for (const id of ids) {
    const preset = presetById(id);
    if (!preset) throw new Error("нет преднастройки " + id);
    const provider = providerFromPreset(preset, id);
    assert.equal(chatCompletionsUrl(provider), preset.base + "/chat/completions");
    assert.equal(provider.modelsBase, undefined);
  }
  const perplexity = presetById("perplexity");
  if (!perplexity) throw new Error("нет преднастройки");
  const provider = providerFromPreset(perplexity, "p");
  assert.equal(chatCompletionsUrl(provider), "https://api.perplexity.ai/chat/completions");
  assert.equal(modelsEndpoint(provider), "https://api.perplexity.ai/v1/models");
});

test("чужой адрес OpenCode больше не берёт его список моделей", () => {
  const preset = presetById("opencode");
  if (!preset) throw new Error("нет преднастройки");
  const provider = providerFromPreset(preset, "1");
  assignProviderBase(provider, "https://example/v1");
  assert.equal(provider.modelsBase, undefined);
  assert.equal(provider.preset, undefined);
  assert.equal(modelsEndpoint(provider), "https://example/v1/models");
});

test("локальный провайдер после адреса остаётся без обязательного ключа", () => {
  const preset = presetById("local");
  if (!preset) throw new Error("нет преднастройки");
  const provider = providerFromPreset(preset, "1");
  assignProviderBase(provider, "http://192.168.1.10:11434/v1");
  assert.equal(provider.access, "open");
  assert.equal(provider.preset, "local");
  assert.equal(providerNeedsKey(provider), false);
});

test("сохранённый доступ и адрес моделей читаются, неизвестный доступ нет", () => {
  const settings = settingsFromSaved({
    activeId: "local",
    providers: [{
      id: "local",
      name: "Локальная",
      base: "http://192.168.1.10:11434/v1",
      key: "",
      model: "qwen",
      access: "open",
      preset: "local",
    }],
  });
  assert.equal(settings.providers[0].access, "open");
  assert.equal(settings.providers[0].preset, "local");
  assert.equal(providerNeedsKey(settings.providers[0]), false);
  assert.throws(() => settingsFromSaved({
    providers: [{ id: "a", name: "A", base: "https://example/v1", key: "", model: "", access: "none" }],
  }), /доступом/);
  assert.throws(() => settingsFromSaved({
    providers: [{ id: "a", name: "A", base: "https://example/v1", key: "", model: "", modelsBase: "  " }],
  }), /адресом моделей/);
});

test("таймаут провайдера читается в секундах, пустое поле не подменяется", () => {
  const settings = settingsFromSaved({
    activeId: "local",
    providers: [{
      id: "local",
      name: "Локальная",
      base: "http://192.168.1.10:11434/v1",
      key: "",
      model: "qwen",
      timeout: 180,
    }],
  });
  assert.equal(settings.providers[0].timeout, 180);
  const plain = settingsFromSaved({
    providers: [{ id: "a", name: "A", base: "https://example/v1", key: "", model: "" }],
  });
  assert.equal(plain.providers[0].timeout, undefined);
  assert.throws(() => settingsFromSaved({
    providers: [{ id: "a", name: "A", base: "https://example/v1", key: "", model: "", timeout: 0 }],
  }), /таймаут/);
  assert.throws(() => settingsFromSaved({
    providers: [{ id: "a", name: "A", base: "https://example/v1", key: "", model: "", timeout: "180" }],
  }), /таймаут/);
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
