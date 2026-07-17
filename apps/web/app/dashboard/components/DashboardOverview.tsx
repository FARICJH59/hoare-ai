"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

type DashboardOverviewProps = {
  signedInAs?: string;
  supabaseConfigured: boolean;
  billing?: string | null;
  checkout?: string | null;
};

const metrics = [
  { labelKey: "activeAgents", value: "–" },
  { labelKey: "workflowsRun", value: "–" },
  { labelKey: "apiRequests", value: "–" },
] as const;

const links = [
  { href: "/dashboard/usecases/prompt", titleKey: "promptPanel", descriptionKey: "promptPanelDescription" },
  { href: "/dashboard/usecases", titleKey: "usecases", descriptionKey: "usecasesDescription" },
  { href: "/dashboard/buildpacks", titleKey: "buildpacks", descriptionKey: "buildpacksDescription" },
  { href: "/dashboard/settings", titleKey: "settings", descriptionKey: "settingsDescription" },
] as const;

export function DashboardOverview({ signedInAs, supabaseConfigured, billing, checkout }: DashboardOverviewProps) {
  const { t } = useI18n();

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tf-holo-text">{t("dashboard")}</h1>
          <p className="mt-2 text-sm text-gray-400">
            {signedInAs ? `${t("signedInAs")} ${signedInAs}` : t("standaloneMode")}
          </p>
        </div>
      </div>

      {!supabaseConfigured && (
        <div className="mb-6 rounded-lg border border-yellow-700 bg-yellow-950/40 p-4 text-sm text-yellow-100">
          {t("supabaseMissing")}
        </div>
      )}
      {billing && <div className="mb-6 rounded-lg border border-yellow-700 bg-yellow-950/40 p-4 text-sm text-yellow-100">{billing}</div>}
      {checkout && <div className="mb-6 rounded-lg border border-blue-700 bg-blue-950/40 p-4 text-sm text-blue-100">{checkout}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metrics.map(({ labelKey, value }) => (
          <div key={labelKey} className="rounded-lg border border-gray-700 bg-gray-900/80 p-6">
            <p className="text-sm text-gray-400">{t(labelKey)}</p>
            <p className="mt-2 text-4xl font-bold text-blue-400">{value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-lg border border-cyan-300/20 bg-gray-900/80 p-6">
        <h2 className="text-xl font-semibold">{t("promptPanel")}</h2>
        <p className="mt-2 text-sm text-gray-400">{t("promptPanelDescription")}</p>
        <Link href="/dashboard/usecases/prompt" className="mt-4 inline-flex rounded-md bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-400">
          {t("openPromptPanel")}
        </Link>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-lg border border-gray-700 bg-gray-900/80 p-6 hover:border-cyan-300/60">
            <h2 className="text-lg font-semibold">{t(item.titleKey)}</h2>
            <p className="mt-2 text-sm text-gray-400">{t(item.descriptionKey)}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
