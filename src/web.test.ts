import assert from "node:assert/strict";
import test from "node:test";
import { blockedPage, extractPageText, formatSearchResults, nonTextContentType, pageUrl, parseSearchHtml, searchQuery, searchUrl, stripEntities, trimFetch } from "./web.ts";

const ISSUES_FIXTURE = [
  "<!DOCTYPE html>",
  "<html><head><title>запрос у DuckDuckGo</title></head>",
  '<body><div class="results_links result__body">',
  '<div class="links_main"><h2 class="result__title">',
  '<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fwiki&amp;rut=abc">Пример &#1056;у</a>',
  "</h2>",
  '<a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fwiki&amp;rut=abc">Сниппет &amp; <b>жирный</b> &#x41E;к</a>',
  "</div></div>",
  '<div class="results_links result__body">',
  '<h2 class="result__title">',
  '<a rel="nofollow" class="result__a" href="https://direct.example.org/page">Прямая ссылка</a>',
  "</h2>",
  '<a class="result__snippet" href="https://direct.example.org/page">Текст &quot;в кавычках&quot;&nbsp;тут</a>',
  "</div>",
  "</body></html>",
].join("\n");

const EMPTY_FIXTURE = '<html><body><div class="no-results">No results.</div></body></html>';

const ANOMALY_FIXTURE = '<html><body><p>Unfortunately, bots use DuckDuckGo too and we have to detect CAPTCHA anomalies.</p></body></html>';

test("выдача DDG разбирается в заголовки, адреса и сниппеты", () => {
  const results = parseSearchHtml(ISSUES_FIXTURE);
  assert.ok(Array.isArray(results));
  assert.equal(results.length, 2);
  assert.deepEqual(results[0], {
    title: "Пример Ру",
    url: "https://example.com/wiki",
    snippet: "Сниппет & жирный Ок",
  });
  assert.equal(results[1].title, "Прямая ссылка");
  assert.equal(results[1].url, "https://direct.example.org/page");
  assert.equal(results[1].snippet, 'Текст "в кавычках" тут');
});

test("пустая выдача остаётся пустым массивом", () => {
  assert.deepEqual(parseSearchHtml(EMPTY_FIXTURE), []);
});

test("капча и посторонняя страница не выдача", () => {
  assert.equal(parseSearchHtml(ANOMALY_FIXTURE), null);
  assert.equal(parseSearchHtml("<html><body>совсем не поиск</body></html>"), null);
});

test("блокировка видна по телу страницы", () => {
  assert.equal(blockedPage(ANOMALY_FIXTURE), true);
  assert.equal(blockedPage(ISSUES_FIXTURE), false);
  assert.equal(blockedPage(EMPTY_FIXTURE), false);
});

test("сущности раскодируются, включая числовые", () => {
  assert.equal(stripEntities("a&amp;b&nbsp;&lt;c&gt;&quot;d&quot;&#39;"), 'a&b <c>"d"\'');
  assert.equal(stripEntities("&#1056;&#x41F;"), "РП");
  assert.equal(stripEntities("&#999999999;"), "&#999999999;");
  assert.equal(stripEntities("нет сущностей"), "нет сущностей");
});

test("запрос валидируется до сети", () => {
  assert.equal(searchQuery({ query: "  поиск  " }), "поиск");
  assert.throws(() => searchQuery({}), /должен быть строкой/);
  assert.throws(() => searchQuery({ query: 5 }), /должен быть строкой/);
  assert.throws(() => searchQuery({ query: "   " }), /пустой запрос/);
  assert.throws(() => searchQuery({ query: "а".repeat(401) }), /длиннее/);
});

test("адрес страницы принимает только http и https", () => {
  assert.equal(pageUrl({ url: " https://example.com/a " }), "https://example.com/a");
  assert.equal(pageUrl({ url: "http://192.168.1.1:8080/" }), "http://192.168.1.1:8080/");
  assert.throws(() => pageUrl({}), /должен быть строкой/);
  assert.throws(() => pageUrl({ url: "" }), /пустой адрес/);
  assert.throws(() => pageUrl({ url: "example.com" }), /не разбирается/);
  assert.throws(() => pageUrl({ url: "file:///etc/passwd" }), /только http и https/);
  assert.throws(() => pageUrl({ url: "data:text/plain,привет" }), /только http и https/);
});

test("адрес поиска собирается из эндпоинта и закодированного запроса", () => {
  assert.equal(searchUrl("кот и пёс"), "https://html.duckduckgo.com/html/?q=" + encodeURIComponent("кот и пёс"));
});

test("текст страницы чистится от скриптов, стилей и разметки", () => {
  const html = [
    "<html><head><title>заголовок окна</title><style>p { color: red }</style></head>",
    "<body>",
    "<h1>Глава</h1>",
    "<!-- <script>заманха -->",
    "<script>var s = \"</scr\" + \"ipt>\";\ndoEvil();</script>",
    "<p>Первый   абзац &amp; &#1056;текст</p>",
    "<div><li>пункт</li><br><span>продолжение</span></div>",
    "<svg><circle/></svg>",
    "<p></p>",
    "<p></p>",
    "<p>Хвост</p>",
    "</body></html>",
  ].join("\n");
  assert.equal(
    extractPageText(html),
    [
      "Глава",
      "",
      "Первый абзац & Ртекст",
      "",
      "пункт",
      "",
      "продолжение",
      "",
      "Хвост",
    ].join("\n"),
  );
});

test("страница из одних скриптов не отдаёт пустой успех", () => {
  assert.equal(extractPageText("<html><body><script>всё в скрипте</script></body></html>"), "");
});

test("длинный текст обрезается с пометкой", () => {
  const text = "а".repeat(40_000);
  assert.equal(trimFetch(text), text);
  const long = "а".repeat(41_234);
  const cut = trimFetch(long);
  assert.equal(cut, "а".repeat(40_000) + "\n(текст обрезан: показано 40000 из 41234 символов)");
});

test("результаты поиска собираются в текст для модели", () => {
  const text = formatSearchResults([
    { title: "Один", url: "https://one.example/", snippet: "сниппет один" },
    { title: "Два", url: "https://two.example/", snippet: "" },
  ]);
  assert.equal(text, "[1] Один\nhttps://one.example/\nсниппет один\n\n[2] Два\nhttps://two.example/");
});

test("выдача ограничена по размеру с пометкой об обрезке", () => {
  const many = Array.from({ length: 8 }, (_, index) => ({
    title: "Т" + index,
    url: "https://example/" + index,
    snippet: "с".repeat(1500),
  }));
  const text = formatSearchResults(many);
  assert.ok(text.length <= 6200, "вывод " + text.length + " символов");
  assert.match(text, /\(обрезано: показано \d+ из 8 результатов\)/);
});

test("бинарный тип содержимого не читается как текст", () => {
  assert.equal(nonTextContentType("image/png"), true);
  assert.equal(nonTextContentType("VIDEO/MP4; charset=utf-8"), true);
  assert.equal(nonTextContentType("application/pdf"), true);
  assert.equal(nonTextContentType("application/zip"), true);
  assert.equal(nonTextContentType("application/octet-stream"), true);
  assert.equal(nonTextContentType("text/html; charset=utf-8"), false);
  assert.equal(nonTextContentType("application/json"), false);
  assert.equal(nonTextContentType(""), false);
});
