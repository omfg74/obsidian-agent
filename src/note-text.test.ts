import assert from "node:assert/strict";
import test from "node:test";
import { NOTE_CHUNK, appendNote, sliceNote } from "./note-text.ts";

test("короткая заметка читается целиком", () => {
  assert.equal(sliceNote("Было так.", 0), "Было так.");
});

test("длинная заметка читается кусками", () => {
  const text = "а".repeat(NOTE_CHUNK) + "ббббб";
  const first = sliceNote(text, 0);
  assert.equal(first, "фрагмент 0-" + NOTE_CHUNK + " из " + text.length + ". Дальше читай с offset " + NOTE_CHUNK + ".\n" + "а".repeat(NOTE_CHUNK));
  const second = sliceNote(text, NOTE_CHUNK);
  assert.equal(second, "фрагмент " + NOTE_CHUNK + "-" + text.length + " из " + text.length + ".\nббббб");
});

test("offset за концом заметки — ошибка", () => {
  assert.throws(() => sliceNote("абв", 3), /за концом заметки/);
  assert.throws(() => sliceNote("абв", 4), /за концом заметки/);
  assert.throws(() => sliceNote("абв", -1), /целым числом/);
  assert.throws(() => sliceNote("абв", 1.5), /целым числом/);
});

test("дописывает в конец и под заголовок", () => {
  assert.equal(appendNote("Было так.", "Ещё."), "Было так.\n\nЕщё.\n");
  assert.equal(appendNote("", "Ещё."), "Ещё.\n");
  const note = "# День\n\n- утро\n\n# Следующий\nхвост";
  assert.equal(appendNote(note, "- вечер", "День"), "# День\n\n- утро\n\n- вечер\n\n# Следующий\nхвост");
  assert.equal(appendNote("# День", "- вечер", "## День"), "# День\n\n- вечер\n");
});

test("заголовок внутри кода не считается, следующий раздел не режется", () => {
  const note = "# День\n\n```\n# День\n```\n\nтекст\n\n## Мелочь\n\nпункт\n\n# Следующий";
  const next = appendNote(note, "добавка", "День");
  assert.equal(next, "# День\n\n```\n# День\n```\n\nтекст\n\n## Мелочь\n\nпункт\n\nдобавка\n\n# Следующий");
});

test("нет заголовка, их несколько или нечего дописывать", () => {
  assert.throws(() => appendNote("# День\n", "x", "Ночь"), /нет заголовка Ночь/);
  assert.throws(() => appendNote("# День\n\n# День\n", "x", "День"), /несколько заголовков День/);
  assert.throws(() => appendNote("текст", "  "), /нечего дописывать/);
  assert.throws(() => appendNote("текст", "x", "   "), /пустой заголовок/);
  assert.equal(appendNote("# День\n", "x", "День"), "# День\n\nx\n");
});
