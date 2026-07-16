type EnvKey =
  | "NEXT_PUBLIC_API_URL"
  | "NEXT_PUBLIC_APP_URL"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_PRICE_ID";

const REQUIRED_SERVER_ENV: EnvKey[] = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID",
];

const REQUIRED_PUBLIC_ENV: EnvKey[] = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

function isPresent(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidHttpUrl(value: string | undefined) {
  if (!isPresent(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getEnv(key: EnvKey) {
  switch (key) {
    case "NEXT_PUBLIC_API_URL":
      return process.env.NEXT_PUBLIC_API_URL;
    case "NEXT_PUBLIC_APP_URL":
      return process.env.NEXT_PUBLIC_APP_URL;
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL;
    case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
      return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    case "STRIPE_SECRET_KEY":
      return process.env.STRIPE_SECRET_KEY;
    case "STRIPE_PRICE_ID":
      return process.env.STRIPE_PRICE_ID;
  }
}

export function getRequiredEnv(key: EnvKey) {
  const value = getEnv(key);
  if (!isPresent(value)) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getRequiredUrlEnv(key: Extract<EnvKey, "NEXT_PUBLIC_API_URL" | "NEXT_PUBLIC_APP_URL" | "NEXT_PUBLIC_SUPABASE_URL">) {
  const value = getRequiredEnv(key);
  if (!isValidHttpUrl(value)) {
    throw new Error(`Environment variable ${key} must be a valid http(s) URL.`);
  }
  return value;
}

export function getRuntimeConfigStatus() {
  const server = REQUIRED_SERVER_ENV.map((key) => ({
    key,
    configured: isPresent(getEnv(key)),
    valid: key.endsWith("_URL") ? isValidHttpUrl(getEnv(key)) : isPresent(getEnv(key)),
  }));

  const publicClient = REQUIRED_PUBLIC_ENV.map((key) => ({
    key,
    configured: isPresent(getEnv(key)),
    valid: key.endsWith("_URL") ? isValidHttpUrl(getEnv(key)) : isPresent(getEnv(key)),
  }));

  const missing = server.filter((item) => !item.configured).map((item) => item.key);
  const invalid = server.filter((item) => item.configured && !item.valid).map((item) => item.key);

  return {
    healthy: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    server,
    publicClient,
  };
}
