export class HardeningError extends Error {
  constructor(public readonly code: string, message: string, public readonly details: Record<string, unknown> = {}) {
    super(message);
    this.name = "HardeningError";
  }
}

export function toSafeError(error: unknown) {
  if (error instanceof HardeningError) return { code: error.code, message: error.message, details: error.details };
  if (error instanceof Error) return { code: "runtime.error", message: error.message };
  return { code: "runtime.unknown", message: "Unknown runtime error" };
}
