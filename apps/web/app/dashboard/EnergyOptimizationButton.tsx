"use client";

import { useState } from "react";

export function EnergyOptimizationButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(mode: "dry-run" | "execute") {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/energy/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Energy optimization failed.");
      setStatus(`${mode === "execute" ? "Executed" : "Dry run complete"}: ${payload.persistedActions ?? 0} actions recorded`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Energy optimization failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={() => run("dry-run")}
        disabled={loading}
        className="rounded-md border border-blue-500 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-950 disabled:opacity-60"
      >
        Dry-run energy optimization
      </button>
      <button
        type="button"
        onClick={() => run("execute")}
        disabled={loading}
        className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-60"
      >
        Execute approved actions
      </button>
      {status && <p className="text-sm text-gray-400 sm:self-center">{status}</p>}
    </div>
  );
}
