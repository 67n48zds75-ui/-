import { build } from "vite";
import react from "@vitejs/plugin-react";
import { readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const temp = resolve(".prerender");
try {
  await build({
    configFile: false,
    plugins: [react()],
    logLevel: "warn",
    build: { ssr: "src/prerender.tsx", outDir: temp, emptyOutDir: true },
  });
  const { render } = await import(
    pathToFileURL(resolve(temp, "prerender.js")).href
  );
  const path = resolve("dist/index.html");
  const html = await readFile(path, "utf8");
  if (!html.includes('<div id="root"></div>'))
    throw new Error("Не найден контейнер для предварительного рендеринга");
  await writeFile(
    path,
    html.replace(
      '<div id="root"></div>',
      () => `<div id="root">${render()}</div>`,
    ),
  );
  console.log("SEO: общая главная страница предварительно отрисована в HTML.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
