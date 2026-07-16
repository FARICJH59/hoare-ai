
export class InMemoryStore<T> {
  private readonly values = new Map<string, T>();

  get(key: string) { return this.values.get(key); }
  set(key: string, value: T) { this.values.set(key, value); return value; }
  delete(key: string) { return this.values.delete(key); }
  list() { return Array.from(this.values.entries()).map(([id, value]) => ({ id, value })); }
  clear() { this.values.clear(); }
}
