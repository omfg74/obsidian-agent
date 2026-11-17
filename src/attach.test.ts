import assert from "node:assert/strict";
import test from "node:test";
import { assertAttachRoom, messageContent, prepareImage, userLine, type Attachment } from "./attach.ts";
import { stripImages } from "./chats.ts";
import type { ChatMessage } from "./agent.ts";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0x01, 0x02, 0x03]);

function failDecode(): Promise<Uint8Array> {
  throw new Error("декодер не нужен");
}

function ftyp(major: string, compatible = ""): Uint8Array {
  const bytes = new Uint8Array(compatible ? 20 : 12);
  bytes.set([0x66, 0x74, 0x79, 0x70], 4);
  bytes.set(Array.from(major).map((char) => char.charCodeAt(0)), 8);
  if (compatible) bytes.set(Array.from(compatible).map((char) => char.charCodeAt(0)), 16);
  return bytes;
}

test("png становится вложением, heic-декодер не вызывается", async () => {
  const item = await prepareImage("папка/кадр.png", png, failDecode);
  assert.equal(item.name, "кадр.png");
  assert.equal(item.mime, "image/png");
  let binary = "";
  for (const byte of png) binary += String.fromCharCode(byte);
  assert.equal(item.base64, btoa(binary));
});

test("heic, heif и mif1 перекодируются в jpeg", async () => {
  for (const brand of ["heic", "heif", "mif1"]) {
    const item = await prepareImage("снимок." + brand, ftyp(brand), async () => jpeg);
    assert.equal(item.mime, "image/jpeg");
    assert.equal(item.name, "снимок.jpg");
  }
  const wrapped = await prepareImage("фото.HEIC", ftyp("isom", "heic"), async () => jpeg);
  assert.equal(wrapped.name, "фото.jpg");
  assert.equal(wrapped.mime, "image/jpeg");
});

test("gif и webp принимаются", async () => {
  const gif = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  const webp = new Uint8Array(12);
  webp.set([0x52, 0x49, 0x46, 0x46], 0);
  webp.set([0x57, 0x45, 0x42, 0x50], 8);
  assert.equal((await prepareImage("a.gif", gif, failDecode)).mime, "image/gif");
  assert.equal((await prepareImage("a.webp", webp, failDecode)).mime, "image/webp");
});

test("пустое имя буфера получает имя по типу", async () => {
  const item = await prepareImage("", jpeg, failDecode);
  assert.equal(item.name, "вложение.jpg");
});

test("чужой формат, пустой файл и слишком большой файл не прикладываются", async () => {
  await assert.rejects(() => prepareImage("a.avif", ftyp("avif"), failDecode), /png, jpeg, gif и webp/);
  await assert.rejects(() => prepareImage("a.png", new Uint8Array(), failDecode), /пустой/);
  const big = new Uint8Array(4 * 1024 * 1024 + 1);
  big.set(png);
  await assert.rejects(() => prepareImage("a.png", big, failDecode), /больше 4 МБ/);
});

test("битый результат перекодирования HEIC не становится картинкой", async () => {
  await assert.rejects(() => prepareImage("a.heic", ftyp("heic"), async () => png), /HEIC не удалось перекодировать/);
  await assert.rejects(() => prepareImage("a.heic", ftyp("heic"), async () => {
    throw new Error("устройство не открыло");
  }), /устройство не открыло/);
});

test("больше четырёх картинок не принимается", () => {
  assert.doesNotThrow(() => assertAttachRoom(3, 1));
  assert.throws(() => assertAttachRoom(3, 2), /четырёх/);
});

test("текст без вложений не меняется, с вложениями картинка уходит в сообщение", () => {
  assert.equal(messageContent("Задание:\nсмотри", []), "Задание:\nсмотри");
  const item: Attachment = { name: "кадр.png", mime: "image/png", base64: "aaaa" };
  const content = messageContent("Фокус: уг.md", [item]);
  assert.ok(Array.isArray(content));
  if (!Array.isArray(content)) return;
  assert.equal(content[0].type, "text");
  if (content[0].type !== "text") return;
  assert.match(content[0].text, /кадр\.png/);
  assert.match(content[0].text, /view_image для них не вызывай/);
  assert.deepEqual(content[1], { type: "image_url", image_url: { url: "data:image/png;base64,aaaa" } });
  const history: ChatMessage[] = [{ role: "user", content }];
  const stored = stripImages(history);
  assert.equal(stored.imagesOmitted, true);
  assert.equal(typeof stored.history[0].content, "string");
});

test("строка чата показывает задание и имена файлов", () => {
  assert.equal(userLine("что здесь", []), "что здесь");
  assert.equal(userLine("", ["кадр.png"]), "кадр.png");
  assert.equal(userLine("что здесь", ["кадр.png", "ещё.jpg"]), "что здесь\nкадр.png, ещё.jpg");
});
