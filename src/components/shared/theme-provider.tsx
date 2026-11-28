"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from "react";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme | undefined;
  systemTheme: ResolvedTheme | undefined;
  setTheme: (theme: Theme | ((prev: Theme) => Theme)) => void;
};

const STORAGE_KEY = "theme";
const DARK_MQ = "(prefers-color-scheme: dark)";
const themeListeners = new Set<() => void>();

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: undefined,
  systemTheme: undefined,
  setTheme: () => {},
});

function isValidTheme(value: string | null, enableSystem: boolean): value is Theme {
  return value === "light" || value === "dark" || (value === "system" && enableSystem);
}

function readStoredTheme(defaultTheme: Theme, enableSystem: boolean): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isValidTheme(stored, enableSystem)) return stored;
  } catch {
    // Ignore storage access errors (e.g. private browsing).
  }
  return defaultTheme;
}

function subscribeTheme(onStoreChange: () => void) {
  themeListeners.add(onStoreChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    themeListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeSystemTheme(onStoreChange: () => void) {
  const mq = window.matchMedia(DARK_MQ);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_MQ).matches ? "dark" : "light";
}

function applyDocumentTheme(resolved: ResolvedTheme, disableTransitionOnChange: boolean) {
  const root = document.documentElement;
  let cleanup: (() => void) | undefined;

  if (disableTransitionOnChange) {
    const style = document.createElement("style");
    style.textContent =
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}";
    document.head.appendChild(style);
    cleanup = () => {
      void window.getComputedStyle(document.body);
      setTimeout(() => style.remove(), 1);
    };
  }

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  cleanup?.();
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    () => readStoredTheme(defaultTheme, enableSystem),
    () => defaultTheme,
  );

  const systemTheme = useSyncExternalStore<ResolvedTheme | undefined>(
    subscribeSystemTheme,
    () => (enableSystem ? getSystemTheme() : undefined),
    () => undefined,
  );

  const resolvedTheme: ResolvedTheme | undefined =
    theme === "system" ? (enableSystem ? systemTheme : "light") : theme;

  useIsomorphicLayoutEffect(() => {
    const target = theme === "system" ? (enableSystem ? getSystemTheme() : "light") : theme;
    applyDocumentTheme(target, disableTransitionOnChange);
  }, [theme, systemTheme, enableSystem, disableTransitionOnChange]);

  const setTheme = useCallback(
    (next: Theme | ((prev: Theme) => Theme)) => {
      const current = readStoredTheme(defaultTheme, enableSystem);
      const value = typeof next === "function" ? next(current) : next;
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        // Ignore storage access errors.
      }
      themeListeners.forEach((listener) => listener());
    },
    [defaultTheme, enableSystem],
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, systemTheme, setTheme }),
    [theme, resolvedTheme, systemTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
