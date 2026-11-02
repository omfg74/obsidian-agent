import assert from "node:assert/strict";
import test from "node:test";
import { readOpenNote, writeOpenNote, type OpenEditor } from "./note-write.ts";

function store(initial: string) {
  let text = initial;
  const calls: string[] = [];
  return {
    calls,
    read: async () => text,
    modify: async (content: string) => {
      calls.push("modify");
      text = content;
    },
    current: () => text,
  };
}

function editor(mode: "source" | "preview", text: string, persist: (content: string) => void) {
  const calls: string[] = [];
  let value = text;
  const open: OpenEditor = {
    mode,
    get: () => value,
    set: (content) => {
      calls.push("set");
      value = content;
    },
    cancelPending: () => {
      calls.push("cancel");
    },
    save: async () => {
      calls.push("save");
      persist(value);
    },
  };
  return { calls, open };
}

test("закрытая и читаемая заметка пишется в хранилище", async () => {
  const disk = store("было");
  await writeOpenNote([{ mode: "preview", get: () => "нельзя", set: () => { throw new Error("редактор"); }, cancelPending: () => { throw new Error("редактор"); }, save: async () => { throw new Error("редактор"); } }], disk, "стало");
  assert.equal(disk.current(), "стало");
  assert.deepEqual(disk.calls, ["modify"]);
});

test("режим правки пишет через редактор и отменяет отложенную запись", async () => {
  const disk = store("было");
  const note = editor("source", "было", (content) => {
    disk.modify(content);
  });
  await writeOpenNote([note.open], disk, "стало");
  assert.deepEqual(note.calls, ["cancel", "set", "save"]);
  assert.equal(disk.current(), "стало");
});

test("правка попадает во все открытые редакторы", async () => {
  const disk = store("было");
  const first = editor("source", "было", (content) => {
    void disk.modify(content);
  });
  const second = editor("source", "было", () => {});
  await writeOpenNote([first.open, second.open], disk, "стало");
  assert.deepEqual(first.calls, ["cancel", "set", "save"]);
  assert.deepEqual(second.calls, ["cancel", "set", "save"]);
  assert.equal(disk.current(), "стало");
});

test("если редактор не дописал файл, запись идёт в хранилище", async () => {
  const disk = store("было");
  const note = editor("source", "было", () => {});
  await writeOpenNote([note.open], disk, "стало");
  assert.equal(disk.current(), "стало");
  assert.deepEqual(disk.calls, ["modify"]);
});

test("файл, который так и не совпал, не считается записанным", async () => {
  const disk = store("было");
  disk.modify = async () => {
    disk.calls.push("modify");
  };
  await assert.rejects(() => writeOpenNote([], disk, "стало"), /файл не сохранился/);
});

test("чтение берёт буфер режима правки", async () => {
  const note = editor("source", "на экране", () => {});
  assert.equal(await readOpenNote([note.open], "на диске"), "на экране");
});

test("в режиме чтения чтение берёт файл", async () => {
  const note = editor("preview", "скрытый буфер", () => {});
  assert.equal(await readOpenNote([note.open], "на диске"), "на диске");
});

test("разный текст в двух редакторах не выбирается сам", async () => {
  const first = editor("source", "один", () => {});
  const second = editor("source", "другой", () => {});
  await assert.rejects(() => readOpenNote([first.open, second.open], "диск"), /разным текстом/);
});
