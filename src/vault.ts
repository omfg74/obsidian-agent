import { replaceOnce } from "./replace.ts";

const TEXT_LIMIT = 100_000;
const LIST_LIMIT = 200;
const IMAGE_LIMIT = 4 * 1024 * 1024;

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export type Listed = { path: string; folder: boolean };

export interface VaultFs {
  find(path: string): Promise<{ path: string; folder: boolean } | null>;
  findMany(path: string): Promise<string[]>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  bytes(path: string): Promise<Uint8Array>;
  children(path: string): Promise<Listed[]>;
  mkdir(path: string): Promise<void>;
}

function folderPath(raw: string): string {
  const path = raw.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!path || path === ".obsidian" || path.startsWith(".obsidian/")) throw new Error("такой путь создать нельзя");
  if (path.split("/").some((part) => part === "" || part === "." || part === "..")) throw new Error("такой путь создать нельзя");
  return path;
}

async function createFolder(fs: VaultFs, raw: string): Promise<string> {
  const parts = folderPath(raw).split("/");
  let current = "";
  const created: string[] = [];
  for (const part of parts) {
    current = current ? current + "/" + part : part;
    const existing = await fs.find(current);
    if (existing?.folder) continue;
    if (existing) throw new Error("это файл: " + current);
    await fs.mkdir(current);
    created.push(current);
  }
  if (created.length === 0) throw new Error("папка уже есть");
  if (created.length === 1) return "создал папку " + created[0];
  return "создал папки " + created.join(", ");
}

function str(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string") throw new Error(key + " должен быть строкой");
  return value;
}

function imageMime(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const mime = IMAGE_MIME[ext];
  if (!mime) throw new Error("модель принимает png, jpeg, gif и webp");
  return mime;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    binary += String.fromCharCode(...bytes.subarray(i, i + size));
  }
  return btoa(binary);
}

export async function resolvePath(fs: VaultFs, raw: string): Promise<string> {
  const name = raw.trim().replace(/^\[\[/, "").replace(/\]\]$/, "").replace(/^\//, "");
  if (name.startsWith(".obsidian/") || name === ".obsidian") throw new Error("папку .obsidian не трогаю");
  const exact = await fs.find(name);
  if (exact && !exact.folder) return exact.path;
  const withMd = name.endsWith(".md") ? null : await fs.find(name + ".md");
  if (withMd && !withMd.folder) return withMd.path;
  const hits = await fs.findMany(name);
  if (hits.length === 1) return hits[0];
  if (hits.length === 0) throw new Error("нет файла " + raw);
  throw new Error("несколько файлов: " + hits.join(", "));
}

export async function dispatchTool(fs: VaultFs, name: string, args: Record<string, unknown>): Promise<{ text: string; image?: { mime: string; base64: string } }> {
  if (name === "list_folder") {
    const path = str(args, "path").replace(/^\//, "").replace(/\/$/, "");
    if (path.startsWith(".obsidian/") || path === ".obsidian") throw new Error("папку .obsidian не читаю");
    const items = await fs.children(path);
    if (items.length > LIST_LIMIT) throw new Error("в папке " + items.length + " записей, укажи более узкий путь");
    if (items.length === 0) return { text: path ? "пусто: " + path : "хранилище пустое" };
    return { text: items.map((item) => (item.folder ? item.path + "/" : item.path)).join("\n") };
  }
  if (name === "create_folder") {
    return { text: await createFolder(fs, str(args, "path")) };
  }
  if (name === "read_note") {
    const path = await resolvePath(fs, str(args, "path"));
    const text = await fs.read(path);
    if (text.length > TEXT_LIMIT) throw new Error("заметка слишком большая: " + text.length + " символов");
    return { text };
  }
  if (name === "view_image") {
    const path = await resolvePath(fs, str(args, "path"));
    const mime = imageMime(path);
    const bytes = await fs.bytes(path);
    if (bytes.byteLength > IMAGE_LIMIT) throw new Error("картинка больше 4 МБ");
    if (bytes.byteLength === 0) throw new Error("файл картинки пустой");
    return { text: "картинка " + path, image: { mime, base64: bytesToBase64(bytes) } };
  }
  if (name === "search_replace") {
    const path = await resolvePath(fs, str(args, "path"));
    const text = await fs.read(path);
    const next = replaceOnce(text, str(args, "old"), str(args, "new"));
    await fs.write(path, next);
    return { text: "заменил в " + path };
  }
  if (name === "write_note") {
    const raw = str(args, "path").trim().replace(/^\//, "");
    if (!raw || raw.startsWith(".obsidian/") || raw === ".obsidian") throw new Error("такой путь записать нельзя");
    const content = str(args, "content");
    await fs.write(raw, content);
    return { text: "записал " + raw + ", " + content.length + " символов" };
  }
  throw new Error("неизвестный инструмент " + name);
}
