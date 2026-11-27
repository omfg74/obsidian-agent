import type { ContentPart } from "./agent.ts";

export const IMAGE_BYTES_LIMIT = 4 * 1024 * 1024;
export const ATTACH_LIMIT = 4;
export const IMAGE_TOO_BIG = "картинка больше 4 МБ";
export const IMAGE_TYPE = "модель принимает png, jpeg, gif и webp";

export type ImageMime = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export type Attachment = { name: string; mime: ImageMime; base64: string };

const EXT: Record<ImageMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

const HEIC_BRAND = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "heif", "mif1", "msf1"]);

export function assertAttachRoom(have: number, adding: number): void {
  if (have + adding > ATTACH_LIMIT) throw new Error("больше четырёх картинок");
}

export async function prepareImage(
  name: string,
  bytes: Uint8Array,
  decodeHeic: (bytes: Uint8Array) => Promise<Uint8Array>,
): Promise<Attachment> {
  if (bytes.byteLength === 0) throw new Error("файл картинки пустой");
  const kind = sniff(bytes);
  if (kind === "heic") return prepareHeic(name, bytes, decodeHeic);
  if (bytes.byteLength > IMAGE_BYTES_LIMIT) throw new Error(IMAGE_TOO_BIG);
  return { name: displayName(name, kind), mime: kind, base64: bytesToBase64(bytes) };
}

export function messageContent(prompt: string, attachments: Attachment[]): string | ContentPart[] {
  if (attachments.length === 0) return prompt;
  const names = attachments.map((item) => item.name).join(", ");
  const note = "Картинки во вложении: " + names + ". Они уже в этом сообщении, view_image для них не вызывай.";
  const text = prompt ? prompt + "\n\n" + note : note;
  return [{ type: "text", text }, ...attachments.map(imagePart)];
}

export function userLine(task: string, names: string[]): string {
  if (names.length === 0) return task;
  const files = names.join(", ");
  if (!task) return files;
  return task + "\n" + files;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    binary += String.fromCharCode(...bytes.subarray(i, i + size));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new Error("вложение повреждено");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function prepareHeic(name: string, bytes: Uint8Array, decodeHeic: (bytes: Uint8Array) => Promise<Uint8Array>): Promise<Attachment> {
  if (bytes.byteLength > IMAGE_BYTES_LIMIT) throw new Error(IMAGE_TOO_BIG);
  const jpeg = await decodeHeic(bytes);
  if (!isJpeg(jpeg)) throw new Error("HEIC не удалось перекодировать");
  if (jpeg.byteLength > IMAGE_BYTES_LIMIT) throw new Error(IMAGE_TOO_BIG);
  return { name: jpegName(name), mime: "image/jpeg", base64: bytesToBase64(jpeg) };
}

function imagePart(item: Attachment): ContentPart {
  return { type: "image_url", image_url: { url: "data:" + item.mime + ";base64," + item.base64 } };
}

function sniff(bytes: Uint8Array): ImageMime | "heic" {
  if (isPng(bytes)) return "image/png";
  if (isJpeg(bytes)) return "image/jpeg";
  if (isGif(bytes)) return "image/gif";
  if (isWebp(bytes)) return "image/webp";
  if (isHeic(bytes)) return "heic";
  throw new Error(IMAGE_TYPE);
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isGif(bytes: Uint8Array): boolean {
  if (bytes.length < 6) return false;
  const header = ascii(bytes, 0, 6);
  return header === "GIF87a" || header === "GIF89a";
}

function isWebp(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP";
}

function isHeic(bytes: Uint8Array): boolean {
  if (bytes.length < 12 || ascii(bytes, 4, 8) !== "ftyp") return false;
  if (HEIC_BRAND.has(ascii(bytes, 8, 12))) return true;
  const end = Math.min(bytes.length, 32);
  for (let i = 16; i + 4 <= end; i += 4) {
    if (HEIC_BRAND.has(ascii(bytes, i, i + 4))) return true;
  }
  return false;
}

function ascii(bytes: Uint8Array, from: number, to: number): string {
  let text = "";
  for (let i = from; i < to; i++) text += String.fromCharCode(bytes[i]);
  return text;
}

function displayName(name: string, mime: ImageMime): string {
  const base = fileTitle(name);
  if (base) return base;
  return "вложение." + EXT[mime];
}

function jpegName(name: string): string {
  const base = fileTitle(name).replace(/\.[^.]+$/, "");
  if (!base) return "вложение.jpg";
  return base + ".jpg";
}

function fileTitle(name: string): string {
  const base = name.trim().split(/[/\\]/).pop()?.trim() ?? "";
  if (!base || base === "." || base === "..") return "";
  if (base.length <= 80) return base;
  return base.slice(0, 80);
}
