// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import type { TelegramWebApp } from "../src/telegram";
let api: typeof import("../src/telegram");
function client(): TelegramWebApp {
  return {
    platform: "ios",
    version: "8.0",
    initData: "",
    colorScheme: "dark",
    ready: vi.fn(),
    expand: vi.fn(),
  };
}
beforeEach(async () => {
  vi.resetModules();
  api = await import("../src/telegram");
  window.history.replaceState({}, "", "/");
  delete window.Telegram;
  document
    .querySelectorAll("[data-mathlab-telegram-sdk]")
    .forEach((node) => node.remove());
  document.documentElement.removeAttribute("style");
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.Telegram;
});
describe("Telegram SDK без блокировки обычного сайта", () => {
  it("обычная страница и произвольный флаг не загружают сторонний SDK", async () => {
    expect(await api.loadTelegram()).toBeNull();
    window.history.replaceState({}, "", "/?telegram=1");
    expect(await api.loadTelegram()).toBeNull();
    expect(
      document.querySelector("script[data-mathlab-telegram-sdk]"),
    ).toBeNull();
  });
  it("поддерживает запуск из query и hash, включая клавиатуру без initData", () => {
    expect(
      api.hasTelegramLaunch({
        search: "?tgWebAppVersion=8.0&tgWebAppPlatform=android",
        hash: "",
      }),
    ).toBe(true);
    expect(
      api.hasTelegramLaunch({
        search: "",
        hash: "#tgWebAppVersion=8.0&tgWebAppPlatform=ios&tgWebAppData=",
      }),
    ).toBe(true);
    expect(
      api.hasTelegramLaunch({ search: "?tgWebAppPlatform=ios", hash: "" }),
    ).toBe(false);
    expect(
      api.hasTelegramLaunch({
        search: "?tgWebAppVersion=8&tgWebAppPlatform=unknown",
        hash: "",
      }),
    ).toBe(false);
  });
  it("использует уже инициализированный SDK, без повторной загрузки", async () => {
    const sdk = client();
    window.Telegram = { WebApp: sdk };
    expect(await api.loadTelegram()).toBe(sdk);
    expect(
      document.querySelector("script[data-mathlab-telegram-sdk]"),
    ).toBeNull();
  });
  it("одна загрузка при двух запросах, без остаточного таймера", async () => {
    vi.useFakeTimers();
    window.history.replaceState(
      {},
      "",
      "/#tgWebAppVersion=8.0&tgWebAppPlatform=ios",
    );
    const first = api.loadTelegram(),
      second = api.loadTelegram();
    expect(first).toBe(second);
    const scripts = document.querySelectorAll<HTMLScriptElement>(
      "script[data-mathlab-telegram-sdk]",
    );
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(api.TELEGRAM_SDK_URL);
    const sdk = client();
    window.Telegram = { WebApp: sdk };
    scripts[0].dispatchEvent(new Event("load"));
    expect(await first).toBe(sdk);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("ошибка загрузки сохраняет рабочую браузерную версию", async () => {
    window.history.replaceState(
      {},
      "",
      "/#tgWebAppVersion=8&tgWebAppPlatform=ios",
    );
    const promise = api.loadTelegram();
    document
      .querySelector("script[data-mathlab-telegram-sdk]")!
      .dispatchEvent(new Event("error"));
    expect(await promise).toBeNull();
  });
  it("недоступный SDK завершает ожидание через 7 секунд", async () => {
    vi.useFakeTimers();
    window.history.replaceState(
      {},
      "",
      "/#tgWebAppVersion=8&tgWebAppPlatform=ios",
    );
    const promise = api.loadTelegram();
    await vi.advanceTimersByTimeAsync(7000);
    expect(await promise).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("без window на этапе SEO-сборки возвращает null", async () => {
    vi.stubGlobal("window", undefined);
    expect(await api.loadTelegram()).toBeNull();
  });
});
describe("Нативное поведение и обратная совместимость", () => {
  it("подписка обновляет тему и отступы, cleanup снимает все события", () => {
    const events = new Map<string, () => void>(),
      off = vi.fn((event: string) => events.delete(event));
    const sdk = {
      ...client(),
      onEvent: (event: string, handler: () => void) =>
        events.set(event, handler),
      offEvent: off,
      safeAreaInset: { top: 20, bottom: 10 },
      contentSafeAreaInset: { top: 12, bottom: 4 },
    };
    const update = vi.fn();
    const cleanup = api.subscribeTelegram(sdk, update);
    expect(update).toHaveBeenLastCalledWith("dark");
    expect(
      document.documentElement.style.getPropertyValue("--mathlab-tg-top"),
    ).toBe("32px");
    sdk.colorScheme = "light";
    events.get("themeChanged")!();
    expect(update).toHaveBeenLastCalledWith("light");
    cleanup();
    expect(events.size).toBe(0);
    expect(off).toHaveBeenCalledTimes(4);
  });
  it("некорректные отступы не попадают в CSS", () => {
    api.syncTelegramInsets({
      ...client(),
      safeAreaInset: { top: -20, bottom: NaN, left: Infinity, right: 1500 },
    });
    const css = document.documentElement.style;
    expect(css.getPropertyValue("--mathlab-tg-top")).toBe("0px");
    expect(css.getPropertyValue("--mathlab-tg-bottom")).toBe("0px");
    expect(css.getPropertyValue("--mathlab-tg-left")).toBe("0px");
    expect(css.getPropertyValue("--mathlab-tg-right")).toBe("1000px");
  });
  it("кнопка назад получает обработчик и освобождает его при закрытии", () => {
    const cb = vi.fn(),
      back = {
        show: vi.fn(),
        hide: vi.fn(),
        onClick: vi.fn(),
        offClick: vi.fn(),
      },
      sdk = { ...client(), BackButton: back };
    const cleanup = api.bindTelegramBack(sdk, cb);
    expect(back.onClick).toHaveBeenCalledWith(cb);
    expect(back.show).toHaveBeenCalledOnce();
    cleanup();
    expect(back.offClick).toHaveBeenCalledWith(cb);
    expect(back.hide).toHaveBeenCalledOnce();
    api.bindTelegramBack(sdk, null);
    expect(back.hide).toHaveBeenCalledTimes(2);
  });
  it("старый клиент без дополнительных методов не ломает тренировку", () => {
    const sdk = client();
    expect(() => {
      api.confirmTelegramClosing(sdk, true);
      api.telegramFeedback(sdk, "success");
      api.setTelegramChrome(sdk, "dark");
      api.bindTelegramBack(sdk, () => {})();
    }).not.toThrow();
  });
  it("ошибка неподдерживаемого haptic или BackButton изолирована", () => {
    const unsupported = () => {
      throw new Error("Not supported");
    };
    const sdk = {
      ...client(),
      HapticFeedback: { notificationOccurred: unsupported },
      BackButton: {
        show: unsupported,
        onClick: unsupported,
        offClick: unsupported,
        hide: unsupported,
      },
      enableClosingConfirmation: unsupported,
    };
    expect(() => {
      api.telegramFeedback(sdk, "error");
      api.confirmTelegramClosing(sdk, true);
      api.bindTelegramBack(sdk, () => {})();
    }).not.toThrow();
  });
  it("включает и отключает предупреждение о закрытии задачи", () => {
    const enable = vi.fn(),
      disable = vi.fn(),
      sdk = {
        ...client(),
        enableClosingConfirmation: enable,
        disableClosingConfirmation: disable,
      };
    api.confirmTelegramClosing(sdk, true);
    api.confirmTelegramClosing(sdk, false);
    expect(enable).toHaveBeenCalledOnce();
    expect(disable).toHaveBeenCalledOnce();
  });
});
