export const NOTE_CHUNK = 100_000;

export function sliceNote(text: string, offset: number): string {
  if (!Number.isInteger(offset) || offset < 0) throw new Error("offset должен быть целым числом от 0");
  if (offset > text.length || (offset === text.length && text.length > 0)) {
    throw new Error("offset " + offset + " за концом заметки (" + text.length + " символов)");
  }
  const end = Math.min(text.length, offset + NOTE_CHUNK);
  const slice = text.slice(offset, end);
  if (offset === 0 && end === text.length) return slice;
  const next = end < text.length ? " Дальше читай с offset " + end + "." : "";
  return "фрагмент " + offset + "-" + end + " из " + text.length + "." + next + "\n" + slice;
}

export function appendNote(text: string, content: string, heading?: string): string {
  const block = content.trim();
  if (!block) throw new Error("нечего дописывать");
  if (heading === undefined) return appendEnd(text, block);
  return appendUnder(text, block, headingTitle(heading));
}

function headingTitle(raw: string): string {
  const trimmed = raw.trim();
  const marked = /^(#{1,6})[ \t]+(.+)$/.exec(trimmed);
  const title = (marked ? marked[2] : trimmed).replace(/\s+#+\s*$/, "").trim();
  if (!title) throw new Error("пустой заголовок");
  return title;
}

function appendEnd(text: string, block: string): string {
  if (text.length === 0) return block + "\n";
  const base = text.endsWith("\n") ? text : text + "\n";
  const gap = base.endsWith("\n\n") ? "" : "\n";
  return base + gap + block + "\n";
}

function appendUnder(text: string, block: string, title: string): string {
  const lines = text.split("\n");
  const hits = headingHits(lines, title);
  if (hits.length === 0) throw new Error("нет заголовка " + title);
  if (hits.length > 1) throw new Error("несколько заголовков " + title);
  const hit = hits[0];
  const end = sectionEnd(lines, hit);
  const body = lines.slice(hit.index + 1, end).join("\n") + (end < lines.length ? "\n" : "");
  const nextBody = body.trim().length === 0 ? "\n" + block + "\n" : appendEnd(body, block);
  let merged = lines.slice(0, hit.index + 1).join("\n") + "\n" + nextBody;
  const tail = lines.slice(end).join("\n");
  if (tail.length === 0) return merged;
  if (!merged.endsWith("\n\n")) merged += "\n";
  return merged + tail;
}

type Hit = { index: number; level: number };

function headingHits(lines: string[], title: string): Hit[] {
  const hits: Hit[] = [];
  let fence: string | null = null;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const marker = fenceMarker(line);
    if (marker) {
      fence = fence === marker ? null : fence ?? marker;
      continue;
    }
    if (fence) continue;
    const parsed = parseHeading(line);
    if (parsed && parsed.title === title) hits.push({ index, level: parsed.level });
  }
  return hits;
}

function sectionEnd(lines: string[], hit: Hit): number {
  let fence: string | null = null;
  for (let index = hit.index + 1; index < lines.length; index++) {
    const line = lines[index];
    const marker = fenceMarker(line);
    if (marker) {
      fence = fence === marker ? null : fence ?? marker;
      continue;
    }
    if (fence) continue;
    const parsed = parseHeading(line);
    if (parsed && parsed.level <= hit.level) return index;
  }
  return lines.length;
}

function parseHeading(line: string): { level: number; title: string } | null {
  const match = /^(#{1,6})[ \t]+(.+?)\s*$/.exec(line);
  if (!match) return null;
  const title = match[2].replace(/\s+#+\s*$/, "").trim();
  if (!title) return null;
  return { level: match[1].length, title };
}

function fenceMarker(line: string): string | null {
  if (line.startsWith("```")) return "```";
  if (line.startsWith("~~~")) return "~~~";
  return null;
}
