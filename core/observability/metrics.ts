
const counters = new Map<string, number>();

export function incrementMetric(name: string, value = 1) {
  counters.set(name, (counters.get(name) ?? 0) + value);
  return { namespace: "observability.metrics", name, value: counters.get(name) ?? value };
}

export function listMetrics() {
  return { namespace: "observability.metrics", count: counters.size, items: Array.from(counters.entries()).map(([name, value]) => ({ name, value })) };
}
