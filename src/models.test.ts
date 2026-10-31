import assert from "node:assert/strict";
import test from "node:test";
import { modelIds } from "./models.ts";

test("modelIds берёт id и сортирует", () => {
  assert.deepEqual(modelIds({ data: [{ id: "gpt-4o" }, { id: "gpt-4o-mini" }, { id: "gpt-4o" }] }), ["gpt-4o", "gpt-4o-mini"]);
});

test("modelIds не подменяет пустой ответ", () => {
  assert.throws(() => modelIds({ data: [] }), /ни одной модели/);
  assert.throws(() => modelIds({}), /нет списка моделей/);
  assert.throws(() => modelIds({ data: [{ id: "" }] }), /без id/);
});
