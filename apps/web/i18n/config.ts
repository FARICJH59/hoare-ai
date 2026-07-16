import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import de from "./de.json";
import zh from "./zh.json";
import hi from "./hi.json";

export const locales = ["en", "es", "fr", "de", "zh", "hi"] as const;
export type Locale = (typeof locales)[number];
export type TranslationKey = keyof typeof en;

export const localeLabels: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  hi: "हिन्दी",
};

export const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  en,
  es,
  fr,
  de,
  zh,
  hi,
};

export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
