import { useEffect, useState } from "react";

type Scheme = "light" | "dark";
type Insets = { top: number; bottom: number; left: number; right: number };
type Handler = () => void;
export type TelegramWebApp = {
  version?: string;
  platform?: string;
  initData?: string;
  colorScheme?: Scheme;
  safeAreaInset?: Partial<Insets>;
  contentSafeAreaInset?: Partial<Insets>;
  ready?: () => void;
  expand?: () => void;
  onEvent?: (event: string, handler: Handler) => void;
  offEvent?: (event: string, handler: Handler) => void;
  BackButton?: {
    show?: () => void;
    hide?: () => void;
    onClick?: (handler: Handler) => void;
    offClick?: (handler: Handler) => void;
  };
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  HapticFeedback?: {
    notificationOccurred?: (kind: "success" | "error" | "warning") => void;
  };
};
declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}
export const TELEGRAM_SDK_URL =
  "https://telegram.org/js/telegram-web-app.js?65";
const call = (fn: Handler | undefined) => {
  try {
    fn?.();
  } catch {
    /* Старые клиенты Telegram могут не поддерживать метод. */
  }
};
function isClient(app: TelegramWebApp | undefined): app is TelegramWebApp {
  return (
    !!app &&
    !!app.platform &&
    app.platform !== "unknown" &&
    typeof app.ready === "function"
  );
}
/** Только определение интерфейса. Launch-параметры не являются доказательством личности. */
export function hasTelegramLaunch(
  location: Pick<Location, "search" | "hash">,
): boolean {
  const params = [
    new URLSearchParams(location.search),
    new URLSearchParams(location.hash.replace(/^#/, "")),
  ];
  return params.some(
    (p) =>
      p.has("tgWebAppVersion") &&
      !!p.get("tgWebAppPlatform") &&
      p.get("tgWebAppPlatform") !== "unknown",
  );
}
let loading: Promise<TelegramWebApp | null> | undefined;
export function loadTelegram(): Promise<TelegramWebApp | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (isClient(window.Telegram?.WebApp))
    return Promise.resolve(window.Telegram.WebApp);
  if (!hasTelegramLaunch(window.location)) return Promise.resolve(null);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = TELEGRAM_SDK_URL;
    script.async = true;
    script.dataset.mathlabTelegramSdk = "true";
    const finish = (app: TelegramWebApp | null) => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      resolve(app);
    };
    const timer = setTimeout(() => finish(null), 7000);
    script.onload = () =>
      finish(
        isClient(window.Telegram?.WebApp) ? window.Telegram!.WebApp! : null,
      );
    script.onerror = () => finish(null);
    try {
      document.head.append(script);
    } catch {
      finish(null);
    }
  });
  return loading;
}
function inset(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1000, value))
    : 0;
}
export function syncTelegramInsets(app: TelegramWebApp) {
  for (const side of ["top", "bottom", "left", "right"] as const) {
    document.documentElement.style.setProperty(
      `--mathlab-tg-${side}`,
      `${inset(app.safeAreaInset?.[side]) + inset(app.contentSafeAreaInset?.[side])}px`,
    );
  }
}
export function subscribeTelegram(
  app: TelegramWebApp,
  update: (scheme: Scheme) => void,
) {
  const sync = () => {
    update(app.colorScheme === "dark" ? "dark" : "light");
    syncTelegramInsets(app);
  };
  const events = [
    "themeChanged",
    "safeAreaChanged",
    "contentSafeAreaChanged",
    "viewportChanged",
  ];
  for (const event of events) call(() => app.onEvent?.(event, sync));
  sync();
  return () => {
    for (const event of events) call(() => app.offEvent?.(event, sync));
  };
}
export function bindTelegramBack(app: TelegramWebApp, handler: Handler | null) {
  const back = app.BackButton;
  if (!handler) {
    call(() => back?.hide?.());
    return () => {};
  }
  call(() => back?.onClick?.(handler));
  call(() => back?.show?.());
  return () => {
    call(() => back?.offClick?.(handler));
    call(() => back?.hide?.());
  };
}
export function confirmTelegramClosing(app: TelegramWebApp, enabled: boolean) {
  call(() =>
    enabled
      ? app.enableClosingConfirmation?.()
      : app.disableClosingConfirmation?.(),
  );
}
export function telegramFeedback(
  app: TelegramWebApp | null,
  kind: "success" | "error",
) {
  call(() => app?.HapticFeedback?.notificationOccurred?.(kind));
}
export function setTelegramChrome(app: TelegramWebApp, scheme: Scheme) {
  const color = scheme === "dark" ? "#131a24" : "#f7f9fc";
  call(() => app.setHeaderColor?.(color));
  call(() => app.setBackgroundColor?.(color));
  call(() => app.setBottomBarColor?.(color));
}
export function useTelegram() {
  const [app, setApp] = useState<TelegramWebApp | null>(null),
    [scheme, setScheme] = useState<Scheme>("light");
  useEffect(() => {
    let disposed = false;
    void loadTelegram().then((value) => {
      if (!disposed) setApp(value);
    });
    return () => {
      disposed = true;
    };
  }, []);
  useEffect(() => {
    if (!app) return;
    const root = document.documentElement;
    root.dataset.telegram = "true";
    call(() => app.ready?.());
    call(() => app.expand?.());
    const cleanup = subscribeTelegram(app, setScheme);
    return () => {
      cleanup();
      confirmTelegramClosing(app, false);
      delete root.dataset.telegram;
      for (const side of ["top", "bottom", "left", "right"])
        root.style.removeProperty(`--mathlab-tg-${side}`);
    };
  }, [app]);
  useEffect(() => {
    if (app) setTelegramChrome(app, scheme);
  }, [app, scheme]);
  return { app, scheme, active: app !== null };
}
