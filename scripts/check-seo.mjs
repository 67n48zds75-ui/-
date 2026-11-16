import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
const site = "https://67n48zds75-ui.github.io/-/";
const html = await readFile("dist/index.html", "utf8");
const document = new JSDOM(html, { url: site }).window.document;
const meta = (name) =>
  document
    .querySelector(`meta[name="${name}"],meta[property="${name}"]`)
    ?.getAttribute("content");
assert.equal(document.documentElement.lang, "ru");
assert.equal(document.querySelectorAll("title").length, 1);
assert.match(document.title, /олимпиадной математики.*9–11/);
assert(
  meta("description")?.length >= 100 && meta("description").length <= 170,
  "Описание должно быть содержательным и коротким",
);
assert.equal(document.querySelector("link[rel=canonical]")?.href, site);
assert.match(meta("robots"), /index, follow/);
assert(!meta("robots").includes("noindex"));
assert.equal(meta("og:url"), site);
assert.equal(meta("og:type"), "website");
assert.equal(meta("og:image"), site + "og-image.png");
assert.equal(meta("twitter:card"), "summary_large_image");
assert.equal(meta("twitter:image"), meta("og:image"));
const graph = JSON.parse(
  document.querySelector('script[type="application/ld+json"]').textContent,
);
assert.equal(graph["@context"], "https://schema.org");
assert(
  graph["@graph"].some(
    (item) =>
      item["@type"] === "WebApplication" &&
      item.isAccessibleForFree &&
      item.url === site,
  ),
);
assert(
  !JSON.stringify(graph).includes("aggregateRating"),
  "Не добавляем выдуманные оценки",
);
const root = document.getElementById("root");
assert.equal(
  root.querySelectorAll("h1").length,
  1,
  "Главная должна иметь ровно один h1 до запуска JS",
);
assert.match(root.querySelector("h1").textContent, /Олимпиадная математика/);
assert(root.querySelector("#about-title"));
assert(
  root.querySelector("main").textContent.length > 1500,
  "Индексируемый HTML должен содержать реальное описание приложения",
);
assert.equal(root.querySelectorAll("[role=dialog]").length, 0);
assert.deepEqual(
  [...root.querySelectorAll(".stat-value")].map((node) =>
    node.textContent.trim(),
  ),
  ["0из 62", "0%", "1/ 10", "0подряд"],
  "В предварительном HTML только начальный общий профиль",
);
for (const node of document.querySelectorAll(
  "link[rel=icon],link[rel=apple-touch-icon],script[src],link[rel=stylesheet],link[rel=modulepreload]",
)) {
  const ref = node.getAttribute("src") ?? node.getAttribute("href");
  const url = new URL(ref, site);
  assert(url.href.startsWith(site), "Ресурс должен загружаться из папки сайта");
  await access(
    resolve("dist", url.pathname.slice(new URL(site).pathname.length)),
  );
}
const png = await readFile("dist/og-image.png");
assert.equal(png.subarray(1, 4).toString(), "PNG");
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
const sitemap = new JSDOM(await readFile("dist/sitemap.xml", "utf8"), {
  contentType: "application/xml",
}).window.document;
assert.deepEqual(
  [...sitemap.querySelectorAll("loc")].map((node) => node.textContent),
  [site],
);
assert(
  (await readFile("dist/robots.txt", "utf8")).includes(
    `Sitemap: ${site}sitemap.xml`,
  ),
);
console.log(
  "SEO: HTML без JavaScript, метаданные, canonical, Schema.org, sitemap, социальная карточка и локальные ресурсы проверены.",
);
console.log(
  "Важно: /-/robots.txt не является корневым robots.txt этого домена.",
);
