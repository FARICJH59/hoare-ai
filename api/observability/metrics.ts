/** Lightweight in-process metrics counter/gauge store. */

type MetricType = "counter" | "gauge" | "histogram";

interface MetricEntry {
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  updatedAt: number;
}

const store = new Map<string, MetricEntry>();

function key(name: string, labels: Record<string, string>): string {
  const labelStr = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(",");
  return `${name}{${labelStr}}`;
}

export const metrics = {
  /** Increment a counter by 1 (or `amount`). */
  increment(name: string, labels: Record<string, string> = {}, amount = 1): void {
    const k = key(name, labels);
    const entry = store.get(k) ?? { name, type: "counter" as const, value: 0, labels, updatedAt: 0 };
    entry.value += amount;
    entry.updatedAt = Date.now();
    store.set(k, entry);
  },

  /** Set an absolute gauge value. */
  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const k = key(name, labels);
    store.set(k, { name, type: "gauge", value, labels, updatedAt: Date.now() });
  },

  /** Record a histogram observation (stored as running sum for simplicity). */
  observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const k = key(name, labels);
    const entry = store.get(k) ?? { name, type: "histogram" as const, value: 0, labels, updatedAt: 0 };
    entry.value += value;
    entry.updatedAt = Date.now();
    store.set(k, entry);
  },

  /** Return all collected metrics as an array. */
  getAll(): MetricEntry[] {
    return Array.from(store.values());
  },

  /** Render metrics in a Prometheus-compatible text format. */
  toPrometheusText(): string {
    return Array.from(store.values())
      .map((m) => {
        const labelStr = Object.entries(m.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(",");
        const metricName = labelStr ? `${m.name}{${labelStr}}` : m.name;
        return `# TYPE ${m.name} ${m.type}\n${metricName} ${m.value}`;
      })
      .join("\n");
  },
};

export default metrics;
