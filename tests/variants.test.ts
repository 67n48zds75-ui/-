import { describe, it, expect, vi } from "vitest";
import katex from "katex";
import { problems, type Problem } from "../src/data";
import { variant, fromResult, freshVariant } from "../src/variants";
import { check, load, csv, type Result } from "../src/engine";
const fact = (n: number): number => (n < 2 ? 1 : n * fact(n - 1));
const binom = (n: number, k: number) =>
  Math.round(fact(n) / fact(k) / fact(n - k));
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const prime = (n: number) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};
const divs = (n: number) =>
  Array.from({ length: n }, (_, i) => i + 1).filter((i) => n % i === 0).length;
function expected(p: Problem): number | string[] {
  const s = p.statement;
  const m = (re: RegExp) => {
    const found = s.match(re);
    if (!found) throw new Error(p.id + ": " + s);
    return found.slice(1).map(Number);
  };
  switch (p.id) {
    case "1-1": {
      const [a] = m(/1\/x=(\d+)/);
      return a * a - 2;
    }
    case "1-2": {
      const [a, c] = m(/x\+(\d+).*?=(\d+)/);
      return c / (4 * a);
    }
    case "1-3": {
      const [a, b] = m(/сумму (\d+) и произведение (\d+)/);
      return a * a - 2 * b;
    }
    case "1-4": {
      const [b, c] = m(/x\^4-(\d+)x\^2\+(\d+)/);
      let count = 0;
      for (let y = -100; y <= 100; y++)
        if (y * y - b * y + c === 0) count += y > 0 ? 2 : y === 0 ? 1 : 0;
      return count;
    }
    case "1-5": {
      const [a] = m(/1\/x=(\d+)/);
      return a ** 3 - 3 * a;
    }
    case "1-6": {
      const [b, c] = m(/x\^2-(\d+)x\+(\d+)/);
      return Array.from({ length: 100 }, (_, i) => i)
        .filter((x) => x * x - b * x + c < 0)
        .reduce((a, b) => a + b, 0);
    }
    case "1-7": {
      const [a, b, c] = m(/x\^5\+(\d+)x\^2\+(\d+).*x-(\d+)/);
      return c ** 5 + a * c * c + b;
    }
    case "1-8": {
      const [sum, prod] = m(/сумма (\d+), произведение (\d+)/);
      const mid = sum / 3;
      return mid + Math.sqrt(mid * mid - prod / mid);
    }
    case "1-9": {
      const [a, b, c] = m(/\((\d+)x([+-]\d+)\)\/\(x-(\d+)\)/);
      return 2 * divs(a * c + b);
    }
    case "1-10": {
      const [s, p] = m(/x\^2-(\d+)x\+(\d+)/);
      return (s * s - 2 * p) ** 2 - 2 * p * p;
    }
    case "1-11": {
      const [a, b] = m(/x\^2-(\d+)\)\(x-(\d+)/);
      return [-Math.sqrt(a), Math.sqrt(a), b].map(String);
    }
    case "2-1": {
      const [a] = m(/вершине равен \$(\d+)/);
      return (180 - a) / 2;
    }
    case "2-2": {
      const [a, b] = m(/равны (\d+) и (\d+)/);
      return Math.hypot(a, b);
    }
    case "2-3": {
      const [a, b] = m(/равны (\d+) и (\d+)/);
      return (a + b) / 2;
    }
    case "2-4":
      return m(/гипотенуза равна (\d+)/)[0] / 2;
    case "2-5": {
      const [a, b, c] = m(/стороны (\d+), (\d+) и (\d+)/),
        h = (a + b + c) / 2;
      return Math.sqrt(h * (h - a) * (h - b) * (h - c));
    }
    case "2-6": {
      const [a, b, c] = m(/равны (\d+) и (\d+).*равна (\d+)/);
      return c * Math.sqrt(b / a);
    }
    case "2-7": {
      const [a, b] = m(/равны (\d+) и (\d+)/);
      return (a + b - Math.hypot(a, b)) / 2;
    }
    case "2-8": {
      const [a, b, c] = m(/одной равны (\d+) и (\d+), другой — (\d+)/);
      return (a * b) / c;
    }
    case "2-9": {
      const [a, b, c] = m(/AB=(\d+), AC=(\d+), BC=(\d+)/);
      return (c * a) / (a + b);
    }
    case "2-10": {
      const [a, b, c] = m(/стороны (\d+), (\d+), (\d+)/),
        h = (a + b + c) / 2,
        area = Math.sqrt(h * (h - a) * (h - b) * (h - c));
      return (a * b * c) / (4 * area);
    }
    case "3-1": {
      const [a, b] = m(/числа \$(\d+)\^\{(\d+)\}/);
      return Number(BigInt(a) ** BigInt(b) % 10n);
    }
    case "3-2": {
      const [a, b] = m(/чисел (\d+) и (\d+)/);
      return gcd(a, b);
    }
    case "3-3": {
      const [a, b] = m(/деления \$(\d+)\^2\$ на (\d+)/);
      return (a * a) % b;
    }
    case "3-4":
      return divs(m(/числа (\d+)/)[0]);
    case "3-5": {
      const [r, a, t, b] = m(
        /остаток (\d+) при делении на (\d+) и остаток (\d+) при делении на (\d+)/,
      );
      for (let x = 1; x <= a * b; x++) if (x % a === r && x % b === t) return x;
      throw new Error("Нет решения");
    }
    case "3-6": {
      const [a] = m(/записи \$(\d+)!/);
      let v = 0;
      for (let power = 5; power <= a; power *= 5) v += Math.floor(a / power);
      return v;
    }
    case "3-7": {
      const [a] = m(/до (\d+) включительно/);
      return Array.from({ length: a }, (_, i) => i + 1).filter(
        (x) => gcd(x, a) === 1,
      ).length;
    }
    case "3-8": {
      const [a, b] = m(/p\+(\d+) и p\+(\d+)/);
      return Array.from({ length: 500 }, (_, i) => i + 2).filter(
        (p) => prime(p) && prime(p + a) && prime(p + b),
      ).length;
    }
    case "3-9": {
      const [a] = m(/котором (\d+)n/);
      for (let x = 1; x < 100; x++)
        if (Number.isInteger(Math.sqrt(a * x))) return x;
      throw new Error("Не найдено");
    }
    case "3-10": {
      const [a] = m(/3x\+5y=(\d+)/);
      let count = 0;
      for (let x = 1; 3 * x < a; x++)
        for (let y = 1; 3 * x + 5 * y <= a; y++)
          if (3 * x + 5 * y === a) count++;
      return count;
    }
    case "3-11":
      return p.options!.filter((v) => prime(Number(v)));
    case "4-1":
      return binom(m(/Из (\d+)/)[0], 2);
    case "4-2": {
      const [a] = m(/от 1 до (\d+)/);
      return a * (a - 1) * (a - 2);
    }
    case "4-3": {
      const [a, b] = m(/сделать (\d+) шагов вправо и (\d+)/);
      return binom(a + b, b);
    }
    case "4-4":
      return 2 * fact(m(/ставят (\d+)/)[0] - 1);
    case "4-5": {
      const [a] = m(/Всего (\d+)/);
      return (1 + Math.sqrt(1 + 8 * a)) / 2;
    }
    case "4-6": {
      const [a] = m(/…,([0-9]+)/);
      let count = 0;
      for (let mask = 0; mask < 2 ** a; mask++)
        if (!(mask & (mask << 1))) count++;
      return count;
    }
    case "4-7":
      return binom(m(/раздать (\d+)/)[0] - 1, 2);
    case "4-8": {
      const [a, b] = m(/перестановкой (\d+) букв А и (\d+)/);
      return binom(a + b, a);
    }
    case "4-9":
      return 2 ** m(/длины (\d+)/)[0] - 1;
    case "4-10":
      return fact(m(/^(\d+)/)[0] - 1);
    case "5-1":
      return (m(/сумму (\d+)/)[0] / 2) ** 2;
    case "5-2": {
      const [b, c] = m(/x\^2-(\d+)x\+(\d+)/);
      return c - (b * b) / 4;
    }
    case "5-3":
      return 2 * Math.sqrt(m(/x\+(\d+)\/x/)[0]);
    case "5-4":
      return m(/сумму (\d+)/)[0] ** 2 / 3;
    case "5-5": {
      const [a, b] = m(/\|x-(\d+)\|\+\|x-(\d+)/);
      return b - a;
    }
    case "5-6":
      return 4 / m(/сумму (\d+)/)[0];
    case "5-7":
      return (m(/сумму (\d+)/)[0] / 3) ** 3;
    case "5-8":
      return 2 * Math.sqrt(m(/x\^2\+(\d+)/)[0]);
    case "5-9": {
      const [a, b] = m(/x-(\d+)\)\^2\+\(x-(\d+)/);
      return (b - a) ** 2 / 2;
    }
    case "5-10":
      return 1 / (2 * Math.sqrt(m(/x\^2\+(\d+)/)[0]));
    case "6-1": {
      const [a, b] = m(/В (\d+) ящиках лежат (\d+)/);
      return Math.ceil(b / a);
    }
    case "6-2": {
      const bothLiars = s.includes("Мы оба лжецы");
      const worlds = [];
      for (const a of [false, true])
        for (const b of [false, true]) {
          const says = bothLiars ? !a && !b : !a || !b;
          if (a === says) worlds.push(Number(b));
        }
      expect(worlds).toHaveLength(1);
      return worlds[0];
    }
    case "6-3":
      return m(/из (\d+) цветов/)[0] + 1;
    case "6-4": {
      const [a, b] = m(/карточки А, К, (\d+), (\d+)/);
      expect(a % 2).toBe(0);
      expect(b % 2).toBe(1);
      return 2;
    }
    case "6-5": {
      let [a] = m(/из (\d+) монет/),
        count = 0;
      while (a > 1) {
        a /= 3;
        count++;
      }
      expect(a).toBe(1);
      return count;
    }
    case "6-6": {
      const [a, b, c] = m(/прибавить (\d+) или вычесть (\d+).*получить (\d+)/);
      expect(c % gcd(a, b)).not.toBe(0);
      return 0;
    }
    case "6-7":
      return 12 * (m(/хотя бы (\d+) человек/)[0] - 1) + 1;
    case "6-8": {
      const [a] = m(/На (\d+) карточках/);
      expect(((a * (a + 1)) / 2) % 2).toBe(1);
      return 0;
    }
    case "6-9": {
      const [a, b] = m(/доски (\d+)×(\d+)/);
      expect((a + b) % 2).toBe(0);
      return 0;
    }
    case "6-10":
      return m(/от 1 до (\d+)/)[0] / 2 + 1;
    default:
      throw new Error(p.id);
  }
}
describe("Генератор вариантов: независимые вычисления по условиям", () => {
  for (const base of problems)
    it(`${base.id}: 40 наборов чисел и формулы`, () => {
      const statements = new Set<string>();
      for (let i = 0; i < 40; i++) {
        const seed = (i * 2654435761) >>> 0,
          p = variant(base, seed),
          answer = expected(p);
        statements.add(p.statement);
        expect(check(p, Array.isArray(answer) ? answer : String(answer))).toBe(
          true,
        );
        expect(p.hints).toHaveLength(3);
        expect(p.solution.length).toBeGreaterThanOrEqual(2);
        if (p.type === "single") {
          expect(p.options).toContain(p.answer);
          expect(new Set(p.options).size).toBe(p.options!.length);
        }
        for (const text of [p.statement, ...p.hints, ...p.solution, p.idea])
          for (const m of text.matchAll(/\$([^$]+)\$/g))
            expect(() =>
              katex.renderToString(m[1], { throwOnError: true, trust: false }),
            ).not.toThrow();
      }
      expect(statements.size).toBeGreaterThan(1);
    });
  it("одинаковый ID и seed воспроизводят весь разбор", () => {
    for (const base of problems)
      expect(fromResult(base.id, 4294967295)).toEqual(
        variant(base, 4294967295),
      );
  });
  it("старые результаты без seed сохраняют исходную задачу", () =>
    expect(fromResult("1-1")).toEqual(problems[0]));
  it("сохраняет seed при загрузке и выводит точное условие в CSV", () => {
    const r: Result = {
      id: "1-1",
      correct: true,
      attempts: 1,
      hints: 0,
      date: new Date().toISOString(),
      mode: "Тренировка",
      session: "test",
      variantSeed: 0,
      generatorVersion: 1,
    };
    expect(
      load(JSON.stringify({ version: 1, theme: "light", results: [r] }))
        .results,
    ).toEqual([r]);
    expect(csv([r])).toContain(variant(problems[0], 0).statement);
    expect(csv([r])).toContain("v1-0");
  });
  it("отбрасывает повреждённые seed и неизвестную версию генератора", () => {
    const r = {
      id: "1-1",
      correct: true,
      attempts: 1,
      hints: 0,
      date: new Date().toISOString(),
      mode: "Тренировка",
      session: "test",
      variantSeed: 0,
      generatorVersion: 1,
    };
    for (const patch of [
      { variantSeed: -1 },
      { variantSeed: 2 ** 32 },
      { variantSeed: 1.5 },
      { variantSeed: "1" },
      { generatorVersion: 2 },
    ])
      expect(
        load(JSON.stringify({ version: 1, results: [{ ...r, ...patch }] }))
          .results,
      ).toHaveLength(0);
  });
  it("не повторяет предыдущее условие даже при повторе случайного seed", () => {
    const spy = vi.spyOn(crypto, "getRandomValues").mockImplementation(((
      a: Uint32Array,
    ) => {
      a[0] = 123;
      return a;
    }) as typeof crypto.getRandomValues);
    try {
      expect(freshVariant(problems[0], [123]).statement).not.toBe(
        variant(problems[0], 123).statement,
      );
    } finally {
      spy.mockRestore();
    }
  });
});
