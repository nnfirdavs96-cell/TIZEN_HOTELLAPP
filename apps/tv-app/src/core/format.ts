import { getLang } from "./i18n";
import type { Money } from "../data/mocks";

const CURRENCY_LOCALES: Record<string, string> = {
  RUB: "ru-RU",
};

export function formatMoney(m: Money): string {
  const locale = CURRENCY_LOCALES[m.currency] ?? (getLang() === "ru" ? "ru-RU" : "en-US");
  const value = Number(m.amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: m.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${m.amount} ${m.currency}`;
  }
}

export function formatDate(iso: string): string {
  const locale = getLang() === "ru" ? "ru-RU" : "en-US";
  try {
    return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  const locale = getLang() === "ru" ? "ru-RU" : "en-US";
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
