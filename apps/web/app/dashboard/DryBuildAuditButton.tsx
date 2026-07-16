"use client";

import { useState } from "react";

interface AuditCheck {
  name: string;
  ok: boolean;
  detail: string;
}

interface AuditResult {
  status: string;
  generatedAt: string;
  checks: AuditCheck[];
}

export function DryBuildAuditButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAudit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dry-build-audit", { method: "POST" });
      if (!res.ok) throw new Error(`Audit failed with status ${res.status}`);
      setResult((await res.json()) as AuditResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 rounded-lg border border-gray-700 bg-gray-900 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dry Build Audit</h2>
          <p className="mt-2 text-sm text-gray-400">
            Validate production readiness without deploying.
          </p>
        </div>
        <button
          type="button"
          onClick={runAudit}
          disabled={loading}
          className="rounded-md border border-blue-500 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Running..." : "Run dry build audit"}
        </button>
      </div>
      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      {result && (
        <div className="mt-4 space-y-2 text-sm">
          <p className="text-gray-400">Status: <span className="text-blue-300">{result.status}</span></p>
          {result.checks.map((item) => (
            <div key={item.name} className="rounded border border-gray-800 p-3">
              <p className={item.ok ? "text-green-300" : "text-yellow-300"}>{item.ok ? "PASS" : "CHECK"} — {item.name}</p>
              <p className="mt-1 text-gray-500">{item.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
