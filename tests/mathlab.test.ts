import { describe, it, expect } from "vitest";
import katex from "katex";
import { problems, topics } from "../src/data";
import {
  check,
  numeric,
  mastery,
  target,
  recommend,
  load,
  csv,
  streak,
  type Result,
} from "../src/engine";
const r = (id = "1-2", correct = true, hints = 0, attempts = 1): Result => ({
  id,
  correct,
  hints,
  attempts,
  date: "2026-11-16T10:00:00.000Z",
  mode: "Тренировка",
  session: "test",
});
const choose = (n: number, k: number) => {
  let a = 1;
  for (let i = 1; i <= k; i++) a = (a * (n - i + 1)) / i;
  return a;
};
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const isPrime = (n: number) =>
  n >= 2 &&
  !Array.from(
    { length: Math.max(0, Math.floor(Math.sqrt(n)) - 1) },
    (_, i) => i + 2,
  ).some((d) => n % d === 0);
// Ответы вычисляются по условиям независимо от текстовых решений.
const verified: number[][] = [
  [
    3 ** 2 - 2,
    80 / 16,
    11 ** 2 - 2 * 24,
    2,
    4 ** 3 - 3 * 4,
    Array.from({ length: 20 }, (_, i) => i - 10)
      .filter((x) => x * x - 7 * x + 10 < 0)
      .reduce((a, b) => a + b, 0),
    2 ** 5 + 2 * 2 ** 2 + 3,
    9 + Math.sqrt(81 - 504 / 9),
    [-7, -1, 1, 7].length,
    (5 ** 2 - 6) ** 2 - 2 * 3 ** 2,
  ],
  [
    (180 - 44) / 2,
    Math.hypot(9, 12),
    (7 + 19) / 2,
    26 / 2,
    Math.sqrt(21 * 8 * 7 * 6),
    6 * Math.sqrt(125 / 20),
    (8 * 15) / 2 / ((8 + 15 + 17) / 2),
    (4 * 15) / 6,
    (20 * 10) / (10 + 15),
    (13 * 14 * 15) / (4 * 84),
  ],
  [
    Number(7n ** 2026n % 10n),
    gcd(252, 198),
    103 ** 2 % 7,
    Array.from({ length: 360 }, (_, i) => i + 1).filter((d) => 360 % d === 0)
      .length,
    Array.from({ length: 35 }, (_, i) => i + 1).find(
      (n) => n % 5 === 2 && n % 7 === 3,
    )!,
    Math.floor(50 / 5) + Math.floor(50 / 25),
    Array.from({ length: 30 }, (_, i) => i + 1).filter((n) => gcd(n, 30) === 1)
      .length,
    1,
    Array.from({ length: 72 }, (_, i) => i + 1).find((n) =>
      Number.isInteger(Math.sqrt(72 * n)),
    )!,
    Array.from({ length: 19 }, (_, i) => i + 1).filter(
      (x) => Number.isInteger((60 - 3 * x) / 5) && (60 - 3 * x) / 5 > 0,
    ).length,
  ],
  [
    choose(8, 2),
    4 * 3 * 2,
    choose(5, 2),
    fact(4) * 2,
    10,
    Array.from({ length: 32 }, (_, n) => n).filter((n) => (n & (n << 1)) === 0)
      .length,
    choose(5, 2),
    fact(5) / (fact(2) * fact(2)),
    2 ** 8 - 1,
    fact(5),
  ],
  [
    9 ** 2,
    23 - 4 ** 2,
    2 * Math.sqrt(16),
    12 ** 2 / 3,
    9 - 2,
    10 / 25,
    5 ** 3,
    2 * Math.sqrt(9),
    2 * 3 ** 2,
    1 / (2 * 5),
  ],
  [
    Math.ceil(17 / 4),
    1,
    3 + 1,
    2,
    Array.from({ length: 9 }, (_, i) => i).find((k) => 3 ** k >= 9)!,
    0,
    12 * 2 + 1,
    Number(15 % 2 === 0),
    0,
    20 / 2 + 1,
  ],
];
describe("Банк задач: независимая проверка ответов", () => {
  it("содержит не менее 60 уникальных задач и все темы", () => {
    expect(problems.length).toBeGreaterThanOrEqual(60);
    expect(new Set(problems.map((p) => p.id)).size).toBe(problems.length);
    for (const t of topics)
      expect(
        problems.filter((p) => p.topic === t).length,
      ).toBeGreaterThanOrEqual(10);
  });
  for (let t = 0; t < 6; t++)
    for (let i = 0; i < 10; i++)
      it(`верный математический ответ ${t + 1}-${i + 1}`, () => {
        const p = problems.find((p) => p.id === `${t + 1}-${i + 1}`)!;
        expect(check(p, String(verified[t][i]))).toBe(true);
        expect(check(p, String(verified[t][i] + 0.125))).toBe(false);
      });
  it("проверяет утверждение о простых p", () => {
    expect(
      Array.from({ length: 10000 }, (_, i) => i + 2).filter(
        (p) => isPrime(p) && isPrime(p + 10) && isPrime(p + 14),
      ),
    ).toEqual([3]);
  });
  it("проверяет несколько ответов независимо от порядка", () => {
    expect(
      check(
        problems.find((p) => p.id === "3-11")!,
        [23, 11, 17].map(String),
      ),
    ).toBe(true);
    expect(
      check(
        problems.find((p) => p.id === "1-11")!,
        ["3", "2", "-2"],
      ),
    ).toBe(true);
    expect(check(problems.at(-1)!, ["2", "3"])).toBe(false);
    expect(check(problems.at(-1)!, ["-3", "-2", "2", "3"])).toBe(false);
  });
  it("каждая формула корректно обрабатывается KaTeX", () => {
    for (const p of problems) {
      expect(p.hints).toHaveLength(3);
      expect(p.solution.length).toBeGreaterThan(0);
      expect(p.difficulty).toBeGreaterThanOrEqual(1);
      expect(p.difficulty).toBeLessThanOrEqual(10);
      for (const text of [p.statement, ...p.hints, ...p.solution, p.idea])
        for (const m of text.matchAll(/\$([^$]+)\$/g))
          expect(() =>
            katex.renderToString(m[1], { throwOnError: true, trust: false }),
          ).not.toThrow();
    }
  });
});
describe("Безопасная проверка ввода", () => {
  for (const input of [
    "",
    "1/0",
    "Infinity",
    "NaN",
    "<script>alert(1)</script>",
    "1;alert(1)",
    "1+2",
    "0x10",
    "1e500",
    "1".repeat(81),
    "1//2",
  ])
    it(`отвергает ${input.slice(0, 20)}`, () =>
      expect(numeric(input)).toBeNull());
  it("принимает дроби, запятую и знак минус", () => {
    expect(numeric(" 65/8 ")).toBe(8.125);
    expect(numeric("0,4")).toBe(0.4);
    expect(numeric("−2")).toBe(-2);
    expect(numeric("1/-2")).toBe(-0.5);
  });
});
describe("Адаптация и хранение", () => {
  it("новичок получает уровень 2", () => expect(target([], topics[0])).toBe(2));
  it("три самостоятельных решения повышают уровень", () =>
    expect(target([r(), r(), r()], topics[0])).toBe(3));
  it("ошибка снижает уровень с нижней границей 1", () => {
    expect(target([r("1-2", false)], topics[0])).toBe(1);
    expect(target([r("1-1", false)], topics[0])).toBe(1);
  });
  it("подсказки и повторы мешают преждевременному повышению", () => {
    expect(target([r(), r(), r("1-2", true, 1)], topics[0])).toBe(2);
    expect(target([r(), r(), r("1-2", true, 0, 2)], topics[0])).toBe(2);
    expect(mastery([r("1-2", true, 2, 2)], topics[0])).toBe(55);
  });
  it("история ограничена последними 8 ответами по теме", () =>
    expect(
      mastery(
        [r("1-2", false), ...Array.from({ length: 8 }, () => r())],
        topics[0],
      ),
    ).toBe(100));
  it("подбор избегает уже решённых задач", () => {
    expect(recommend([r()], topics[0]).id).not.toBe("1-2");
    expect(recommend([], topics[0]).difficulty).toBe(2);
  });
  it("изолирует темы", () => expect(mastery([r()], topics[1])).toBe(0));
  it("серия сбрасывается после ошибки", () => {
    expect(streak([r(), r("1-1", false), r()])).toBe(1);
  });
  it("восстанавливает прогресс и отбрасывает повреждения", () => {
    expect(load("{")).toEqual({ version: 1, results: [], theme: "light" });
    expect(
      load(
        JSON.stringify({
          version: 1,
          results: [r(), { ...r(), id: "fake" }, { ...r(), hints: 20 }],
          theme: "dark",
        }),
      ).results,
    ).toEqual([r()]);
    expect(
      load(JSON.stringify({ version: 1, results: [r()], theme: "dark" })).theme,
    ).toBe("dark");
  });
  it("экспортирует реальные данные в CSV", () => {
    expect(csv([r()])).toContain("Алгебра");
    expect(csv([r()])).toContain("Верно");
    expect(csv([]).split("\r\n")).toHaveLength(2);
  });
});
