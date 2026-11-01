import assert from "node:assert/strict";
import test from "node:test";
import { capacitorOptions, httpRoute, readHttpResult, withDeadline } from "./http.ts";

test("запрос к CapacitorHttp получает таймаут чтения и соединения", () => {
  const options = capacitorOptions({
    url: "http://192.168.1.10:11434/v1/chat/completions",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }, 180000);
  assert.equal(options.readTimeout, 180000);
  assert.equal(options.connectTimeout, 180000);
  assert.equal(options.responseType, "text");
  assert.equal(options.data, "{}");
  const get = capacitorOptions({ url: "http://192.168.1.10:11434/v1/models", method: "GET", headers: {} }, 5000);
  assert.equal(get.data, undefined);
});

test("ответ CapacitorHttp остаётся текстом, объект становится JSON", () => {
  assert.equal(readHttpResult(200, "data: {}\n").text, "data: {}\n");
  assert.equal(readHttpResult(200, { id: "qwen" }).text, "{\"id\":\"qwen\"}");
  assert.throws(() => readHttpResult("200", "x"), /кода/);
  assert.throws(() => readHttpResult(200, null), /пустой/);
});

test("на iPad берётся CapacitorHttp, на компьютере requestUrl", () => {
  const request = () => Promise.resolve({ status: 200, data: "" });
  const mobile = httpRoute({
    Capacitor: {
      getPlatform: () => "ios",
      isPluginAvailable: (name: string) => name === "CapacitorHttp",
      Plugins: { CapacitorHttp: { request } },
    },
  });
  assert.equal(mobile.kind, "capacitor");
  const desktop = httpRoute({ Capacitor: { getPlatform: () => "web", Plugins: { CapacitorHttp: { request } } } });
  assert.equal(desktop.kind, "obsidian");
  const missing = httpRoute({ Capacitor: { getPlatform: () => "ios", isPluginAvailable: () => false } });
  assert.equal(missing.kind, "unavailable");
  assert.equal(httpRoute({}).kind, "obsidian");
});

test("дедлайн обрывает ожидание и гасит поздний отказ", async () => {
  const pending = new Promise<string>((_resolve, reject) => {
    setTimeout(() => reject(new Error("позже")), 40);
  });
  await assert.rejects(withDeadline(pending, 10, "таймаут 1 с"), /таймаут 1 с/);
  await new Promise((resolve) => setTimeout(resolve, 60));
});
