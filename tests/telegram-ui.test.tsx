// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
  waitFor,
  act,
} from "@testing-library/react";
import App from "../src/App";
import type { TelegramWebApp } from "../src/telegram";
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
let back: (() => void) | null,
  events: Map<string, () => void>,
  sdk: TelegramWebApp;
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  events = new Map();
  back = null;
  sdk = {
    platform: "ios",
    version: "8.0",
    initData: "user=PRIVATE_TEST_USER_DATA",
    colorScheme: "dark",
    ready: vi.fn(),
    expand: vi.fn(),
    onEvent: (event, handler) => events.set(event, handler),
    offEvent: (event) => {
      events.delete(event);
    },
    BackButton: {
      onClick: (handler) => {
        back = handler;
      },
      offClick: (handler) => {
        if (back === handler) back = null;
      },
      show: vi.fn(),
      hide: vi.fn(),
    },
    enableClosingConfirmation: vi.fn(),
    disableClosingConfirmation: vi.fn(),
    HapticFeedback: { notificationOccurred: vi.fn() },
  };
  window.Telegram = { WebApp: sdk };
});
afterEach(() => {
  cleanup();
  delete window.Telegram;
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "clipboard");
});
async function openMini() {
  const view = render(<App />);
  await screen.findByRole("navigation", { name: "Разделы Mini App" });
  return view;
}
describe("Mini App: пользовательские сценарии", () => {
  it("инициализирует Telegram и переключается вслед за его темой", async () => {
    await openMini();
    expect(sdk.ready).toHaveBeenCalled();
    expect(sdk.expand).toHaveBeenCalled();
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("dark"),
    );
    sdk.colorScheme = "light";
    act(() => events.get("themeChanged")!());
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("mathlab-v1")).not.toContain(
      "PRIVATE_TEST_USER_DATA",
    );
  });
  it("нижние вкладки и нативная кнопка назад возвращают на главную", async () => {
    await openMini();
    const nav = screen.getByRole("navigation", { name: "Разделы Mini App" });
    fireEvent.click(within(nav).getByRole("button", { name: "Задачи" }));
    expect(
      screen.getByRole("heading", { name: /Задачи, которые развивают/ }),
    ).toBeTruthy();
    expect(sdk.BackButton!.show).toHaveBeenCalled();
    expect(back).not.toBeNull();
    act(() => back!());
    expect(
      screen.getByRole("heading", { name: /Олимпиадная математика с MathLab/ }),
    ).toBeTruthy();
    expect(back).toBeNull();
  });
  it("закрывает текущую задачу через Telegram и управляет предупреждением", async () => {
    await openMini();
    fireEvent.click(screen.getByRole("button", { name: "Начать тренировку" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(sdk.enableClosingConfirmation).toHaveBeenCalled();
    const callback = back;
    expect(callback).not.toBeNull();
    act(() => callback!());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(sdk.disableClosingConfirmation).toHaveBeenCalled();
  });
  it("показывает доступный CSV-экспорт и копирует историю без передачи в сеть", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      get: () => ({ writeText }),
    });
    await openMini();
    fireEvent.click(
      within(
        screen.getByRole("navigation", { name: "Разделы Mini App" }),
      ).getByRole("button", { name: "Прогресс" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Экспорт CSV" }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("textbox", { name: "Статистика в формате CSV" }),
    ).toBeTruthy();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Копировать CSV" }),
    );
    await screen.findByText("CSV скопирован. Вставьте его в файл или таблицу.");
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Дата;Тема;Задача"),
    );
    act(() => back!());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("heading", { name: /Ваш прогресс в деталях/ }),
    ).toBeTruthy();
  });
  it("при запрете clipboard выделяет текст для ручного копирования", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      get: () => ({
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      }),
    });
    await openMini();
    fireEvent.click(
      within(
        screen.getByRole("navigation", { name: "Разделы Mini App" }),
      ).getByRole("button", { name: "Профиль" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    const textarea = screen.getByRole("textbox", {
      name: "Статистика в формате CSV",
    }) as HTMLTextAreaElement;
    fireEvent.click(screen.getByRole("button", { name: "Копировать CSV" }));
    await screen.findByText(/Текст выделен/);
    expect(textarea.selectionStart).toBe(0);
    expect(textarea.selectionEnd).toBe(textarea.value.length);
  });
  it("освобождает native BackButton, подписки и состояние документа после выхода", async () => {
    const view = await openMini();
    fireEvent.click(
      within(
        screen.getByRole("navigation", { name: "Разделы Mini App" }),
      ).getByRole("button", { name: "Задачи" }),
    );
    view.unmount();
    expect(back).toBeNull();
    expect(events.size).toBe(0);
    expect(document.documentElement.dataset.telegram).toBeUndefined();
  });
});
