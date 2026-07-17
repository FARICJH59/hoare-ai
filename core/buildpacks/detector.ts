import { existsSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import type { BuildPackDetectionResult } from "./manifest";

function files(rootPath: string, dir: string): string[] {
  const start = join(rootPath, dir);
  if (!existsSync(start)) return [];
  const out: string[] = [];
  const walk = (path: string) => {
    for (const entry of readdirSync(path)) {
      const next = join(path, entry);
      if (statSync(next).isDirectory()) walk(next);
      else if (/\.(ts|tsx|json|css)$/.test(entry)) out.push(relative(rootPath, next));
    }
  };
  walk(start);
  return out.sort();
}

export function detectProjectComponents(rootPath = process.cwd()): BuildPackDetectionResult {
  const web = "apps/web/app/dashboard";
  return {
    namespace: "buildpacks.detector",
    rootPath,
    detectedAt: new Date().toISOString(),
    components: {
      agents: files(rootPath, "core/agents"),
      workflows: files(rootPath, "core/workflows"),
      tools: files(rootPath, "core/tools"),
      safety: files(rootPath, "core/safety"),
      risk: files(rootPath, "core/risk"),
      observability: files(rootPath, "core/observability"),
      events: files(rootPath, "core/events"),
      messaging: files(rootPath, "core/messaging"),
      scheduling: files(rootPath, "core/scheduling"),
      persistence: files(rootPath, "core/persistence"),
      federation: files(rootPath, "core/federation"),
      usecases: files(rootPath, "core/usecases").filter((file) => !file.includes("templates/") && !file.includes("packs/")),
      templates: files(rootPath, "core/usecases/templates"),
      packs: files(rootPath, "core/usecases/packs"),
      deployment: files(rootPath, "core/usecases/deployment"),
      governance: files(rootPath, "core/usecases/governance"),
      versioning: files(rootPath, "core/usecases/versioning"),
      analytics: files(rootPath, "core/usecases/analytics"),
      marketplace: files(rootPath, "core/usecases/marketplace"),
      dashboards: files(rootPath, web),
      holographicUI: [
        ...files(rootPath, "apps/web/app/dashboard/components").filter((file) => /Holographic|TechFusionLogo3D|ThemeController|LanguageSwitcher/.test(file)),
        ...files(rootPath, "apps/web/i18n"),
        "apps/web/app/dashboard/settings/page.tsx",
      ].filter((file) => existsSync(join(rootPath, file))),
      quantumShaders: files(rootPath, "apps/web/app/dashboard/components").filter((file) => file.includes("HolographicQuantumLayer")),
    },
  };
}
