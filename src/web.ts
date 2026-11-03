export type SearchResult = { title: string; url: string; snippet: string };

const SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/?q=";
const SEARCH_LIMIT = 8;
const SEARCH_OUTPUT_LIMIT = 6000;
const QUERY_LIMIT = 400;
const FETCH_RESPONSE_LIMIT = 2_000_000;
const FETCH_TEXT_LIMIT = 40_000;

/** Разметка выдачи, от которой считаем страницу поисковой. */
const SEARCH_MARK = "result__a";
/** Разметка страницы «ничего не найдено». */
const EMPTY_MARK = "no-results";
/** Признаки блокировки или капчи в теле ответа. */
const BLOCK_MARKS = ["anomaly", "captcha", "unusual activity", "unusual traffic"];

const RESULT_RE = /<a[^>]*class="[^"]*\bresult__a\b[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
const SNIPPET_RE = /<a[^>]*class="[^"]*\bresult__snippet\b[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

const NAMED_ENTITIES: Record<string, string> = {
  quot: '"',
  amp: "&",
  lt: "<",
  gt: ">",
  nbsp: " ",
};

const COMMENT_RE = /<!--[\s\S]*?-->/g;
const HIDDEN_RE = /<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1\s*>/gis;
const BLOCK_TAG_RE = /(<\/(?:p|li|h[1-6]|tr|div|section)>|<br\s*\/?>)/gi;
const TAG_RE = /<[^>]+>/g;
const NUMERIC_ENTITY_RE = /&#(\d+);|&#x([0-9a-fA-F]+);/g;
const NAMED_ENTITY_RE = /&([a-z]+);/g;

export function searchQuery(args: Record<string, unknown>): string {
  const value = args.query;
  if (typeof value !== "string") throw new Error("web_search: query должен быть строкой");
  const query = value.trim();
  if (!query) throw new Error("web_search: пустой запрос");
  if (query.length > QUERY_LIMIT) throw new Error("web_search: запрос длиннее " + QUERY_LIMIT + " символов");
  return query;
}

export function pageUrl(args: Record<string, unknown>): string {
  const value = args.url;
  if (typeof value !== "string") throw new Error("fetch_url: url должен быть строкой");
  const raw = value.trim();
  if (!raw) throw new Error("fetch_url: пустой адрес");
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("fetch_url: адрес не разбирается: " + raw);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("fetch_url: только http и https");
  if (!parsed.hostname) throw new Error("fetch_url: в адресе нет хоста");
  return raw;
}

export function searchUrl(query: string): string {
  return SEARCH_ENDPOINT + encodeURIComponent(query);
}

export function blockedPage(html: string): boolean {
  const body = html.toLowerCase();
  return BLOCK_MARKS.some((mark) => body.includes(mark));
}

export function parseSearchHtml(html: string): SearchResult[] | null {
  if (!html.includes(SEARCH_MARK) && !html.includes(EMPTY_MARK)) return null;
  const titles: Array<{ url: string; title: string }> = [];
  for (const match of collectMatches(RESULT_RE, html)) {
    titles.push({ url: resultUrl(match[1]), title: cleanText(match[2]) });
  }
  const snippets: string[] = [];
  for (const match of collectMatches(SNIPPET_RE, html)) {
    snippets.push(cleanText(match[1]));
  }
  return titles.map((item, index) => ({ title: item.title, url: item.url, snippet: snippets[index] ?? "" }));
}

function collectMatches(re: RegExp, html: string): RegExpExecArray[] {
  const found: RegExpExecArray[] = [];
  for (let match = re.exec(html); match; match = re.exec(html)) {
    found.push(match);
  }
  return found;
}

function resultUrl(href: string): string {
  const match = /[?&]uddg=([^&"']+)/.exec(href);
  if (!match) return href.startsWith("//") ? "https:" + href : href;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return href;
  }
}

function cleanText(fragment: string): string {
  return stripEntities(fragment.replace(TAG_RE, " ")).replace(/\s+/g, " ").trim();
}

export function stripEntities(text: string): string {
  const numeric = text.replace(NUMERIC_ENTITY_RE, (raw, dec: string | undefined, hex: string | undefined) => {
    const code = dec !== undefined ? Number(dec) : parseInt(hex as string, 16);
    if (Number.isInteger(code) && code > 0 && code <= 0x10ffff) {
      try {
        return String.fromCodePoint(code);
      } catch {
        // нет такого символа — оставляем сущность как есть
      }
    }
    return raw;
  });
  return numeric.replace(NAMED_ENTITY_RE, (raw, name: string) => NAMED_ENTITIES[name] ?? raw);
}

export function extractPageText(html: string): string {
  const body = html
    .replace(COMMENT_RE, " ")
    .replace(HIDDEN_RE, " ")
    .replace(BLOCK_TAG_RE, "\n")
    .replace(TAG_RE, " ");
  const lines: string[] = [];
  for (const raw of stripEntities(body).split("\n")) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line || (lines.length > 0 && lines[lines.length - 1] !== "")) lines.push(line);
  }
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

export function formatSearchResults(results: SearchResult[]): string {
  const blocks: string[] = [];
  let size = 0;
  for (let index = 0; index < results.length && index < SEARCH_LIMIT; index++) {
    const item = results[index];
    const block = "[" + (index + 1) + "] " + item.title + "\n" + item.url + (item.snippet ? "\n" + item.snippet : "");
    if (size + block.length > SEARCH_OUTPUT_LIMIT && blocks.length > 0) {
      blocks.push("(обрезано: показано " + blocks.length + " из " + results.length + " результатов)");
      return blocks.join("\n\n");
    }
    blocks.push(block);
    size += block.length + 2;
  }
  return blocks.join("\n\n");
}

export function trimFetch(text: string): string {
  if (text.length <= FETCH_TEXT_LIMIT) return text;
  return text.slice(0, FETCH_TEXT_LIMIT) + "\n(текст обрезан: показано " + FETCH_TEXT_LIMIT + " из " + text.length + " символов)";
}

export function nonTextContentType(contentType: string): boolean {
  const type = contentType.trim().toLowerCase();
  if (!type) return false;
  const head = type.split(/[;,\s]/)[0];
  if (!head) return false;
  if (/^(image|video|audio)\//.test(head)) return true;
  return head === "application/pdf" || head === "application/zip" || head === "application/octet-stream";
}
