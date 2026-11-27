import { IMAGE_BYTES_LIMIT, IMAGE_TOO_BIG, IMAGE_TYPE, base64ToBytes, bytesToBase64, type Attachment } from "./attach.ts";
import { appendNote, sliceNote } from "./note-text.ts";
import { replaceOnce } from "./replace.ts";
import { extractPageText, formatSearchResults, nonTextContentType, pageUrl, parseSearchHtml, blockedPage, searchQuery, searchUrl, trimFetch } from "./web.ts";
import type { HttpInit } from "./http.ts";

const LIST_LIMIT = 200;
const FETCH_RESPONSE_LIMIT = 2_000_000;

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
  writeBytes(path: string, bytes: Uint8Array): Promise<void>;
  bytes(path: string): Promise<Uint8Array>;
  children(path: string): Promise<Listed[]>;
  mkdir(path: string): Promise<void>;
  trash(path: string): Promise<void>;
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

function optStr(args: Record<string, unknown>, key: string): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(args, key) || args[key] === undefined) return undefined;
  const value = args[key];
  if (typeof value !== "string") throw new Error(key + " должен быть строкой");
  if (!value.trim()) throw new Error(key + " пустой");
  return value;
}

function noteOffset(args: Record<string, unknown>): number {
  if (!Object.prototype.hasOwnProperty.call(args, "offset") || args.offset === undefined) return 0;
  const value = args.offset;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new Error("offset должен быть целым числом от 0");
  return value;
}

function newFilePath(raw: string): string {
  const path = raw.trim().replace(/^\/+/, "");
  if (!path || path === ".obsidian" || path.startsWith(".obsidian/")) throw new Error("такой путь записать нельзя");
  if (path.split("/").some((part) => part === "" || part === "." || part === "..")) throw new Error("такой путь записать нельзя");
  return path;
}

async function assertCanCreate(fs: VaultFs, path: string): Promise<void> {
  const existing = await fs.find(path);
  if (existing?.folder) throw new Error("это папка");
  if (existing) throw new Error("файл уже есть: " + path);
  const slash = path.lastIndexOf("/");
  if (slash <= 0) return;
  const parent = path.slice(0, slash);
  const folder = await fs.find(parent);
  if (!folder) throw new Error("нет папки " + parent);
  if (!folder.folder) throw new Error("это файл: " + parent);
}

async function saveAttachment(fs: VaultFs, args: Record<string, unknown>, attachments: Attachment[] | undefined): Promise<string> {
  const name = str(args, "name");
  const path = newFilePath(str(args, "path"));
  const note = optStr(args, "note");
  const heading = optStr(args, "heading");
  if (heading !== undefined && note === undefined) throw new Error("heading указан без заметки");
  const bytes = takeAttachment(attachments, name);
  await assertCanCreate(fs, path);
  let notePath: string | undefined;
  let nextNote: string | undefined;
  if (note !== undefined) {
    notePath = await resolvePath(fs, note);
    nextNote = appendNote(await fs.read(notePath), "![[" + path + "]]", heading);
  }
  await fs.writeBytes(path, bytes);
  if (notePath === undefined || nextNote === undefined) return "сохранил " + path;
  try {
    await fs.write(notePath, nextNote);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error("сохранил " + path + ", но заметку не записал: " + message);
  }
  return "сохранил " + path + " и вставил в " + notePath;
}

function takeAttachment(attachments: Attachment[] | undefined, name: string): Uint8Array {
  if (!attachments) throw new Error("в этом сообщении нет вложений");
  const hits = attachments.filter((item) => item.name === name);
  if (hits.length === 0) throw new Error("нет вложения " + name);
  if (hits.length > 1) throw new Error("несколько вложений " + name);
  return base64ToBytes(hits[0].base64);
}

function imageMime(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const mime = IMAGE_MIME[ext];
  if (!mime) throw new Error(IMAGE_TYPE);
  return mime;
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

export interface WebHttp {
  fetch(init: HttpInit): Promise<{ status: number; text: string; contentType: string }>;
}

export async function dispatchTool(
  fs: VaultFs,
  name: string,
  args: Record<string, unknown>,
  web?: WebHttp,
  attachments?: Attachment[],
): Promise<{ text: string; image?: { mime: string; base64: string } }> {
  if (name === "web_search") {
    if (!web) throw new Error("поиск в сети выключен в настройках");
    return { text: await webSearch(web, args) };
  }
  if (name === "fetch_url") {
    if (!web) throw new Error("поиск в сети выключен в настройках");
    return { text: await fetchPage(web, args) };
  }
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
    return { text: sliceNote(text, noteOffset(args)) };
  }
  if (name === "view_image") {
    const path = await resolvePath(fs, str(args, "path"));
    const mime = imageMime(path);
    const bytes = await fs.bytes(path);
    if (bytes.byteLength > IMAGE_BYTES_LIMIT) throw new Error(IMAGE_TOO_BIG);
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
  if (name === "append_note") {
    const path = await resolvePath(fs, str(args, "path"));
    const text = await fs.read(path);
    const next = appendNote(text, str(args, "content"), optStr(args, "heading"));
    await fs.write(path, next);
    return { text: "дописал в " + path };
  }
  if (name === "save_attachment") {
    return { text: await saveAttachment(fs, args, attachments) };
  }
  if (name === "delete_note") {
    const path = await resolvePath(fs, str(args, "path"));
    await fs.trash(path);
    return { text: "отправил в корзину " + path };
  }
  throw new Error("неизвестный инструмент " + name);
}

async function webSearch(web: WebHttp, args: Record<string, unknown>): Promise<string> {
  const query = searchQuery(args);
  const res = await web.fetch({ url: searchUrl(query), method: "GET", headers: {} });
  if (res.status !== 200) {
    const body = res.text.slice(0, 300);
    throw new Error("поиск ответил " + res.status + (body ? ": " + body : ""));
  }
  const results = parseSearchHtml(res.text);
  if (results === null) throw new Error("разметка выдачи не распознана");
  if (results.length === 0) {
    if (blockedPage(res.text)) throw new Error("поиск не отдал результата (возможно, запрос заблокирован)");
    throw new Error("поиск не нашёл результатов");
  }
  return formatSearchResults(results);
}

async function fetchPage(web: WebHttp, args: Record<string, unknown>): Promise<string> {
  const url = pageUrl(args);
  const res = await web.fetch({ url, method: "GET", headers: {} });
  if (res.status !== 200) {
    const body = res.text.slice(0, 300);
    throw new Error("страница ответила " + res.status + (body ? ": " + body : ""));
  }
  if (nonTextContentType(res.contentType)) throw new Error("страница не текстовая (Content-Type: " + res.contentType + ")");
  if (res.text.startsWith("%PDF") || res.text.startsWith("PK")) throw new Error("страница не текстовая: в начале тела " + (res.text.startsWith("%PDF") ? "%PDF (pdf)" : "PK (zip)"));
  if (res.text.length > FETCH_RESPONSE_LIMIT) throw new Error("страница больше " + FETCH_RESPONSE_LIMIT + " символов: " + res.text.length);
  const text = extractPageText(res.text);
  if (!text) throw new Error("в странице не нашлось текста");
  return trimFetch(text);
}
