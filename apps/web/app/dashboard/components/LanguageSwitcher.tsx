"use client";

import { localeLabels, locales, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="flex items-center gap-2 rounded-full border border-cyan-300/25 bg-black/40 px-3 py-2 text-xs text-cyan-100 shadow-[0_0_24px_rgba(59,245,255,0.18)] backdrop-blur-xl">
      <span>{t("language")}</span>
      <select className="bg-transparent text-white outline-none" value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
        {locales.map((item) => <option key={item} className="bg-slate-950" value={item}>{localeLabels[item]}</option>)}
      </select>
    </label>
  );
}
