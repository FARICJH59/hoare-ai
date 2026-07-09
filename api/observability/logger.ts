export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  event: string;
  timestamp: string;
  pid: number;
  data?: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function log(level: LogLevel, event: string, data?: unknown): void {
  if (!shouldLog(level)) return;
  const entry: LogEntry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    ...(data !== undefined ? { data } : {}),
  };
  const out = JSON.stringify(entry);
  if (level === "error" || level === "warn") {
    process.stderr.write(out + "\n");
  } else {
    process.stdout.write(out + "\n");
  }
}

export const structuredLogger = {
  debug: (event: string, data?: unknown) => log("debug", event, data),
  info: (event: string, data?: unknown) => log("info", event, data),
  warn: (event: string, data?: unknown) => log("warn", event, data),
  error: (event: string, data?: unknown) => log("error", event, data),
};

export default structuredLogger;
