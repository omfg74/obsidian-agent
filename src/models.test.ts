import assert from "node:assert/strict";
import test from "node:test";
import { listedModels, modelMenuLabel } from "./models.ts";

test("список берёт id и сортирует, без цены подписи нет", () => {
  const models = listedModels({ data: [{ id: "gpt-4o" }, { id: "gpt-4o-mini" }, { id: "gpt-4o" }] });
  assert.deepEqual(models.map((model) => model.id), ["gpt-4o", "gpt-4o-mini"]);
  assert.equal(models[0].pay, null);
  assert.equal(models[0].images, null);
  assert.equal(models[0].context, null);
  assert.equal(modelMenuLabel(models[0]), "gpt-4o");
});

test("пустой ответ и запись без id не подменяются", () => {
  assert.throws(() => listedModels({ data: [] }), /ни одной модели/);
  assert.throws(() => listedModels({}), /нет списка моделей/);
  assert.throws(() => listedModels({ data: [{ id: "" }] }), /без id/);
});

test("нулевая цена токенов — бесплатно, картинки по входным типам", () => {
  const models = listedModels({
    data: [
      {
        id: "b-free-text",
        pricing: { prompt: "0", completion: "0", overrides: [{ prompt: "1" }] },
        architecture: { modality: "text->text", input_modalities: ["text"] },
      },
      {
        id: "a-free-vision",
        pricing: { prompt: "0", completion: "0" },
        architecture: { modality: "text+image->text", input_modalities: ["text", "image"] },
      },
      {
        id: "c-paid-vision",
        pricing: { prompt: "0.0000025", completion: "0.00001", image: "0.001", web_search: "0.01" },
        architecture: { modality: "text+image+file->text", input_modalities: ["file", "image", "text"] },
      },
      {
        id: "d-paid-text",
        pricing: { prompt: 0, completion: 0.01 },
        architecture: { input_modalities: ["text"] },
      },
    ],
  });
  const label = (id: string) => modelMenuLabel(models.find((model) => model.id === id)!);
  assert.equal(label("a-free-vision"), "бесплатно · картинки · a-free-vision");
  assert.equal(label("b-free-text"), "бесплатно · без картинок · b-free-text");
  assert.equal(label("c-paid-vision"), "платно · картинки · c-paid-vision");
  assert.equal(label("d-paid-text"), "платно · без картинок · d-paid-text");
});

test("цена без пары токенов и битая цена не становятся бесплатно", () => {
  const models = listedModels({
    data: [
      { id: "image-only", pricing: { image: "0" }, architecture: { input_modalities: ["image"] } },
      { id: "broken", pricing: { prompt: "бесплатно", completion: "0" }, architecture: { input_modalities: ["text"] } },
    ],
  });
  const byId = (id: string) => models.find((model) => model.id === id)!;
  const noPair = byId("image-only");
  const broken = byId("broken");
  assert.equal(noPair.pay, null);
  assert.equal(noPair.images, true);
  assert.equal(modelMenuLabel(noPair), "картинки · image-only");
  assert.equal(broken.pay, null);
  assert.equal(broken.images, false);
});

test("картинки читаются из modality и из supports_vision", () => {
  const [generates, reads, flag] = listedModels({
    data: [
      { id: "draw", architecture: { modality: "text->image" } },
      { id: "see", architecture: { modality: "text+image->text" } },
      { id: "flag", supports_vision: true },
    ],
  });
  assert.equal(generates.images, false);
  assert.equal(reads.images, true);
  assert.equal(flag.images, true);
  assert.equal(flag.pay, null);
});

test("OpenCode оставляет chat completions и читает цену и картинки", () => {
  const models = listedModels({
    data: [
      {
        id: "claude-sonnet",
        api: { messages: { base_url: "https://opencode.ai/inference/anthropic/v1" } },
        modalities: { input: ["text", "image/png"], output: ["text"] },
      },
      {
        id: "kimi-k3",
        api: { "chat-completions": { base_url: "https://opencode.ai/inference/openai/v1" } },
        modalities: { input: ["text", "image/jpeg", "image/png"], output: ["text"] },
        cost: { text: { input: { price: 3 }, output: { price: 15 } } },
      },
      {
        id: "big-pickle",
        api: { "chat-completions": { base_url: "https://opencode.ai/inference/openai/v1" } },
        modalities: { input: ["text"], output: ["text"] },
        cost: { text: { input: { price: 0 }, output: { price: 0 } } },
      },
    ],
  });
  assert.deepEqual(models.map((model) => model.id), ["big-pickle", "kimi-k3"]);
  assert.equal(modelMenuLabel(models[0]), "бесплатно · без картинок · big-pickle");
  assert.equal(modelMenuLabel(models[1]), "платно · картинки · kimi-k3");
});

test("список только из другого API не становится пустым успехом", () => {
  assert.throws(() => listedModels({
    data: [{ id: "gpt", api: { responses: {} } }],
  }), /chat completions/);
});

test("размер окна берётся из одного поля списка", () => {
  const models = listedModels({
    data: [
      { id: "router", context_length: 128000 },
      { id: "groq", context_window: 8192 },
      { id: "mistral", max_context_length: 32768 },
      { id: "same", context_length: 4096, context_window: 4096 },
    ],
  });
  const context = (id: string) => models.find((model) => model.id === id)?.context;
  assert.equal(context("router"), 128000);
  assert.equal(context("groq"), 8192);
  assert.equal(context("mistral"), 32768);
  assert.equal(context("same"), 4096);
});

test("битый или разный размер окна не подменяется", () => {
  const models = listedModels({
    data: [
      { id: "text", context_length: "128000" },
      { id: "zero", context_length: 0 },
      { id: "split", context_length: 1000, context_window: 2000 },
      { id: "broken-pair", context_length: "нет", context_window: 8192 },
    ],
  });
  for (const model of models) assert.equal(model.context, null);
});

test("вход и выход together считаются ценой", () => {
  const [model] = listedModels({
    data: [{ id: "llama", pricing: { input: 0.18, output: 0.18, hourly: 0 } }],
  });
  assert.equal(model.pay, "paid");
  assert.equal(model.images, null);
  assert.equal(modelMenuLabel(model), "платно · llama");
});
