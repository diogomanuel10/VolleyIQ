import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
export type ThemeSetting = Theme | "system";

const STORAGE_KEY = "volleyiq:theme";
const LIGHT_META = "#ffffff";
const DARK_META = "#0f172a";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredSetting(): ThemeSetting {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function resolve(setting: ThemeSetting): Theme {
  return setting === "system" ? getSystemTheme() : setting;
}

function applyToDocument(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? DARK_META : LIGHT_META;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let currentSetting: ThemeSetting = getStoredSetting();

function notify() {
  for (const l of listeners) l();
}

export function setThemeSetting(setting: ThemeSetting) {
  currentSetting = setting;
  if (typeof window !== "undefined") {
    if (setting === "system") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, setting);
  }
  applyToDocument(resolve(setting));
  notify();
}

export function toggleTheme() {
  // Alterna apenas entre light e dark — quem quiser "system" escolhe no menu.
  const next: Theme = resolve(currentSetting) === "dark" ? "light" : "dark";
  setThemeSetting(next);
}

/**
 * Hook reactivo para componentes React. Devolve a preferência guardada
 * (`"light" | "dark" | "system"`) e o tema efectivo (`"light" | "dark"`).
 */
export function useTheme() {
  const setting = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentSetting,
    () => "system" as ThemeSetting,
  );
  return {
    setting,
    theme: resolve(setting),
    setTheme: setThemeSetting,
    toggle: toggleTheme,
  };
}

/**
 * Segue alterações do sistema quando a preferência guardada é `"system"`.
 * Chamado uma vez a partir de `main.tsx` — não precisa correr antes do React
 * montar porque o script inline em `index.html` já aplicou o tema inicial.
 */
export function watchSystemTheme() {
  if (typeof window === "undefined") return;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (currentSetting === "system") {
      applyToDocument(resolve("system"));
      notify();
    }
  };
  mq.addEventListener("change", handler);
}
