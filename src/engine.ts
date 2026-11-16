import { problems, topics, type Problem, type Topic } from "./data";
export type Result = {
  id: string;
  correct: boolean;
  attempts: number;
  hints: number;
  date: string;
  mode: string;
  session: string;
};
export type Progress = {
  version: 1;
  results: Result[];
  theme: "light" | "dark";
};
export const empty: Progress = { version: 1, results: [], theme: "light" };
export function numeric(value: string): number | null {
  const s = value.trim().replace(",", ".").replace("−", "-");
  if (s.length > 80) return null;
  if (
    !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:\s*\/\s*[+-]?(?:\d+(?:\.\d+)?|\.\d+))?$/.test(
      s,
    )
  )
    return null;
  const [a, b] = s.split("/").map(Number);
  const n = b === undefined ? a : a / b;
  return Number.isFinite(n) ? n : null;
}
export function check(p: Problem, value: string | string[]): boolean {
  if (p.type === "multiple") {
    if (!Array.isArray(value)) return false;
    return (
      [...new Set(value)].sort().join("|") ===
      p.answer.split("|").sort().join("|")
    );
  }
  if (Array.isArray(value)) return false;
  const n = numeric(value),
    a = numeric(p.answer);
  return n !== null && a !== null && Math.abs(n - a) < 1e-8;
}
export function mastery(results: Result[], topic: Topic) {
  const recent = results
    .filter((r) => problems.find((p) => p.id === r.id)?.topic === topic)
    .slice(-8);
  if (!recent.length) return 0;
  return Math.round(
    (100 *
      recent.reduce(
        (s, r) =>
          s +
          (r.correct
            ? Math.max(0.2, 1 - r.hints * 0.15 - (r.attempts - 1) * 0.15)
            : 0),
        0,
      )) /
      recent.length,
  );
}
export function target(results: Result[], topic: Topic) {
  const rs = results
    .filter((r) => problems.find((p) => p.id === r.id)?.topic === topic)
    .slice(-3);
  if (!rs.length) return 2;
  const last = problems.find((p) => p.id === rs.at(-1)!.id)!.difficulty;
  const strong =
    rs.length === 3 &&
    rs.every((r) => r.correct && r.hints === 0 && r.attempts === 1);
  return Math.max(
    1,
    Math.min(10, last + (strong ? 1 : rs.at(-1)!.correct ? 0 : -1)),
  );
}
export function recommend(results: Result[], topic?: Topic, seed = 0) {
  const chosen =
    topic ??
    [...topics].sort(
      (a, b) =>
        mastery(results, a) - mastery(results, b) ||
        results.filter((r) => problems.find((p) => p.id === r.id)?.topic === a)
          .length -
          results.filter(
            (r) => problems.find((p) => p.id === r.id)?.topic === b,
          ).length,
    )[seed % topics.length];
  const done = new Set(results.filter((r) => r.correct).map((r) => r.id));
  return [...problems.filter((p) => p.topic === chosen)].sort(
    (a, b) =>
      Number(done.has(a.id)) - Number(done.has(b.id)) ||
      Math.abs(a.difficulty - target(results, chosen)) -
        Math.abs(b.difficulty - target(results, chosen)),
  )[0];
}
export function load(raw: string | null): Progress {
  try {
    if (!raw || raw.length > 2000000) return { ...empty };
    const p = JSON.parse(raw);
    if (p.version !== 1 || !Array.isArray(p.results)) return { ...empty };
    return {
      version: 1,
      theme: p.theme === "dark" ? "dark" : "light",
      results: p.results
        .filter(
          (r: Result) =>
            r &&
            typeof r === "object" &&
            problems.some((p) => p.id === r.id) &&
            typeof r.correct === "boolean" &&
            Number.isInteger(r.attempts) &&
            r.attempts >= 1 &&
            r.attempts <= 100 &&
            Number.isInteger(r.hints) &&
            r.hints >= 0 &&
            r.hints <= 3 &&
            typeof r.date === "string" &&
            Number.isFinite(Date.parse(r.date)) &&
            typeof r.mode === "string" &&
            r.mode.length < 40 &&
            typeof r.session === "string" &&
            r.session.length < 100,
        )
        .slice(-5000)
        .map((r: Result) => ({ ...r, date: new Date(r.date).toISOString() })),
    };
  } catch {
    return { ...empty };
  }
}
export function streak(results: Result[]) {
  let n = 0;
  for (const r of [...results].reverse()) {
    if (!r.correct) break;
    n++;
  }
  return n;
}
export function csv(results: Result[]) {
  return (
    "\ufeffДата;Тема;Задача;Сложность;Результат;Попытки;Подсказки\r\n" +
    results
      .map((r) => {
        const p = problems.find((p) => p.id === r.id)!;
        return [
          r.date,
          p.topic,
          p.title,
          p.difficulty,
          r.correct ? "Верно" : "Ошибка",
          r.attempts,
          r.hints,
        ]
          .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
          .join(";");
      })
      .join("\r\n")
  );
}
