// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
  act,
} from "@testing-library/react";
import App from "../src/App";
import { problems } from "../src/data";
import { variant } from "../src/variants";
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
const seed = 123456;
const generated = (id: string) =>
  variant(
    problems.find((p) => p.id === id)!,
    seed,
  );
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(crypto, "getRandomValues").mockImplementation(((
    array: Uint32Array,
  ) => {
    array[0] = seed;
    return array;
  }) as typeof crypto.getRandomValues);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const catalog = () =>
  fireEvent.click(screen.getByRole("button", { name: /Каталог задач/ }));
function openByTitle(title: string) {
  catalog();
  fireEvent.click(screen.getByRole("button", { name: new RegExp(title) }));
  return screen.getByRole("dialog");
}
describe("Рабочие сценарии интерфейса", () => {
  it("отображает главную с настоящим нулевым прогрессом", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /Время для новых открытий/ }),
    ).toBeTruthy();
    expect(screen.getByText("Всё начинается с первой задачи")).toBeTruthy();
  });
  it("фильтрует каталог по теме, сложности и названию", () => {
    render(<App />);
    catalog();
    fireEvent.change(screen.getByLabelText("Тема"), {
      target: { value: "Алгебра" },
    });
    fireEvent.change(screen.getByLabelText("Сложность"), {
      target: { value: "1" },
    });
    expect(screen.getByText("Найдено 1 задач")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Поиск задач"), {
      target: { value: "несуществующая" },
    });
    expect(screen.getByText("Найдено 0 задач")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Сбросить фильтры"));
    expect(screen.getByText("Найдено 62 задач")).toBeTruthy();
  });
  it("проверяет ошибку, подсказку, верный ответ и восстановление истории", () => {
    const view = render(<App />);
    const dialog = openByTitle("Симметрия корней");
    fireEvent.change(within(dialog).getByLabelText("Ваш ответ"), {
      target: { value: String(Number(generated("1-1").answer) + 1) },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Проверить ответ" }),
    );
    expect(screen.getByRole("status").textContent).toContain("Пока неверно");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Подсказка 1/ }),
    );
    fireEvent.change(within(dialog).getByLabelText("Ваш ответ"), {
      target: { value: generated("1-1").answer },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Проверить ответ" }),
    );
    expect(
      screen.getByRole("heading", { name: "Разбор решения" }),
    ).toBeTruthy();
    const saved = JSON.parse(localStorage.getItem("mathlab-v1")!);
    expect(saved.results[0]).toMatchObject({
      correct: true,
      attempts: 2,
      hints: 1,
    });
    view.unmount();
    render(<App />);
    fireEvent.click(
      within(screen.getByRole("navigation")).getByRole("button", {
        name: "Мой профиль",
      }),
    );
    expect(screen.getByText("Первый шаг")).toBeTruthy();
    expect(screen.getByText("Симметрия корней")).toBeTruthy();
  });
  it("завершение после неправильного ответа не добавляет лишнюю попытку", () => {
    render(<App />);
    const d = openByTitle("Симметрия корней");
    fireEvent.change(within(d).getByLabelText("Ваш ответ"), {
      target: { value: "1" },
    });
    fireEvent.click(within(d).getByRole("button", { name: "Проверить ответ" }));
    fireEvent.click(
      within(d).getByRole("button", { name: "Завершить и узнать решение" }),
    );
    expect(
      JSON.parse(localStorage.getItem("mathlab-v1")!).results[0],
    ).toMatchObject({ correct: false, attempts: 1 });
  });
  it("проверяет несколько правильных вариантов", () => {
    render(<App />);
    const d = openByTitle("Простые среди соседей");
    for (const n of generated("3-11").answer.split("|"))
      fireEvent.click(within(d).getByLabelText(n));
    fireEvent.click(within(d).getByRole("button", { name: "Проверить ответ" }));
    expect(screen.getByRole("status").textContent).toContain("Верно!");
  });
  it("сохраняет тёмную тему после перезагрузки компонента", () => {
    const view = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Тёмная тема" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    view.unmount();
    render(<App />);
    expect(screen.getByRole("button", { name: "Светлая тема" })).toBeTruthy();
  });
  it("ежедневная тренировка содержит 5 задач и отключается после выполнения", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Тренировка дня" }));
    for (let i = 0; i < 5; i++) {
      const d = screen.getByRole("dialog");
      expect(d.textContent).toContain(`${i + 1} из 5`);
      fireEvent.click(
        within(d).getByRole("button", { name: "Завершить и узнать решение" }),
      );
      fireEvent.click(
        within(d).getByRole("button", {
          name: i === 4 ? "Итоги тренировки" : "Следующая задача",
        }),
      );
    }
    expect(screen.getByText("Тренировка завершена!")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Посмотреть статистику" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Главная" }));
    expect(
      screen
        .getByRole("button", { name: "На сегодня всё — отлично!" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      JSON.parse(localStorage.getItem("mathlab-v1")!).results,
    ).toHaveLength(5);
  });
  it("таймер олимпиады завершает сессию, подсказок нет", () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Режим олимпиады/ }));
    expect(screen.queryByRole("button", { name: /Подсказка/ })).toBeNull();
    expect(screen.getByText("20:00")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
    });
    expect(screen.getByText("Время олимпиады истекло.")).toBeTruthy();
    expect(
      JSON.parse(localStorage.getItem("mathlab-v1")!).results[0].correct,
    ).toBe(false);
  });
  it("достижение за серию сохраняется после последующей ошибки", () => {
    localStorage.setItem(
      "mathlab-v1",
      JSON.stringify({
        version: 1,
        theme: "light",
        results: [
          ...Array.from({ length: 5 }, (_, i) => ({
            id: problems[i].id,
            correct: true,
            attempts: 1,
            hints: 0,
            date: new Date().toISOString(),
            mode: "Тренировка",
            session: "a",
          })),
          {
            id: "1-1",
            correct: false,
            attempts: 1,
            hints: 0,
            date: new Date().toISOString(),
            mode: "Тренировка",
            session: "b",
          },
        ],
      }),
    );
    render(<App />);
    fireEvent.click(
      within(screen.getByRole("navigation")).getByRole("button", {
        name: "Мой профиль",
      }),
    );
    expect(
      screen.getByText("В потоке").closest(".badge")?.textContent,
    ).toContain("Получено");
  });
  it("числа не меняются при неверном ответе или подсказке, но меняются при новом открытии", () => {
    render(<App />);
    const d = openByTitle("Симметрия корней");
    const statement = d.querySelector(".statement")!.textContent;
    fireEvent.change(within(d).getByLabelText("Ваш ответ"), {
      target: { value: "-999" },
    });
    fireEvent.click(within(d).getByRole("button", { name: "Проверить ответ" }));
    fireEvent.click(within(d).getByRole("button", { name: /Подсказка 1/ }));
    expect(d.querySelector(".statement")!.textContent).toBe(statement);
    fireEvent.click(within(d).getByRole("button", { name: "Закрыть задачу" }));
    const next = openByTitle("Симметрия корней");
    expect(next.querySelector(".statement")!.textContent).not.toBe(statement);
  });
  it("история восстанавливает прежние числа и разбор без новой записи результата", () => {
    const view = render(<App />);
    const d = openByTitle("Симметрия корней");
    const statement = d.querySelector(".statement")!.textContent;
    fireEvent.click(
      within(d).getByRole("button", { name: "Завершить и узнать решение" }),
    );
    const saved = JSON.parse(localStorage.getItem("mathlab-v1")!);
    expect(saved.results[0]).toMatchObject({
      variantSeed: seed,
      generatorVersion: 1,
    });
    view.unmount();
    render(<App />);
    fireEvent.click(
      within(screen.getByRole("navigation")).getByRole("button", {
        name: "Мой профиль",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Разбор: Симметрия корней" }),
    );
    const restored = screen.getByRole("dialog");
    expect(restored.querySelector(".statement")!.textContent).toBe(statement);
    expect(
      within(restored).getByRole("heading", { name: "Разбор решения" }),
    ).toBeTruthy();
    fireEvent.click(
      within(restored).getByRole("button", { name: "Вернуться к истории" }),
    );
    expect(
      JSON.parse(localStorage.getItem("mathlab-v1")!).results,
    ).toHaveLength(1);
  });
  it("варианты из старой истории открываются с исходными числами", () => {
    localStorage.setItem(
      "mathlab-v1",
      JSON.stringify({
        version: 1,
        theme: "light",
        results: [
          {
            id: "1-1",
            correct: true,
            attempts: 1,
            hints: 0,
            date: new Date().toISOString(),
            mode: "Тренировка",
            session: "old",
          },
        ],
      }),
    );
    render(<App />);
    fireEvent.click(
      within(screen.getByRole("navigation")).getByRole("button", {
        name: "Мой профиль",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Разбор: Симметрия корней" }),
    );
    expect(
      screen.getByRole("dialog").querySelector(".correct-answer")!.textContent,
    ).toBe("Ответ: 7");
  });
});
