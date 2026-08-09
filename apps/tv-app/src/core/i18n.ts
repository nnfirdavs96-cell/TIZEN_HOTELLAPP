import ru from "../i18n/ru.json";
import en from "../i18n/en.json";

export type Lang = "ru" | "en";
type Dict = Record<string, string>;

const DICTS: Record<Lang, Dict> = { ru, en };
const STORAGE_KEY = "hga.lang";
const listeners = new Set<(lang: Lang) => void>();

let current: Lang = readInitial();

function readInitial(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ru" || stored === "en") return stored;
  } catch {
    // localStorage unavailable
  }
  const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "en";
  return nav.startsWith("ru") ? "ru" : "en";
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  document.documentElement.lang = lang;
  listeners.forEach((cb) => cb(lang));
}

export function toggleLang(): void {
  setLang(current === "ru" ? "en" : "ru");
}

export function onLangChange(cb: (lang: Lang) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = DICTS[current] ?? DICTS.en;
  const raw = dict[key] ?? DICTS.en[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}
