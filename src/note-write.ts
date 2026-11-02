export type NoteMode = "source" | "preview";

export interface OpenEditor {
  mode: NoteMode;
  get(): string;
  set(content: string): void;
  cancelPending(): void;
  save(): Promise<void>;
}

export interface NoteStore {
  read(): Promise<string>;
  modify(content: string): Promise<void>;
}

export async function readOpenNote(editors: OpenEditor[], stored: string): Promise<string> {
  const source = editors.filter((editor) => editor.mode === "source");
  if (source.length === 0) return stored;
  const text = source[0].get();
  for (const editor of source.slice(1)) {
    if (editor.get() !== text) throw new Error("заметка открыта в нескольких редакторах с разным текстом");
  }
  return text;
}

export async function writeOpenNote(editors: OpenEditor[], store: NoteStore, content: string): Promise<void> {
  const source = editors.filter((editor) => editor.mode === "source");
  if (source.length === 0) {
    await store.modify(content);
  } else {
    for (const editor of source) editor.cancelPending();
    for (const editor of source) editor.set(content);
    for (const editor of source) await editor.save();
  }
  if ((await store.read()) === content) return;
  await store.modify(content);
  if ((await store.read()) !== content) throw new Error("файл не сохранился");
}
