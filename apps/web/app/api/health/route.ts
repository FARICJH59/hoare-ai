import { NextResponse } from "next/server";
import { getRuntimeConfigStatus, getRequiredUrlEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 5;

const HEALTH_CHECK_TIMEOUT_MS = 2_000;

async function checkBackend() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

  try {
    const baseUrl = getRequiredUrlEnv("NEXT_PUBLIC_API_URL");
    const response = await fetch(`${baseUrl}/health`, {
      cache: "no-store",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    return {
      reachable: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.name : "UnknownError",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const config = getRuntimeConfigStatus();
  const backend = await checkBackend();
  const healthy = config.healthy && backend.reachable;

  const exposeDetails = process.env.VERCEL_ENV !== "production";
  const configCheck = exposeDetails
    ? { healthy: config.healthy, missing: config.missing, invalid: config.invalid }
    : { healthy: config.healthy, missingCount: config.missing.length, invalidCount: config.invalid.length };

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "hoare-ai-web",
      vercelEnv: process.env.VERCEL_ENV ?? "local",
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      checkedAt: new Date().toISOString(),
      checks: {
        config: configCheck,
        backend,
      },
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
