import { Role, Permission } from "../shared-types";

// ── RBAC ──────────────────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: ["read"],
  operator: ["read", "execute"],
  admin: ["read", "write", "execute", "admin"],
  service: ["read", "execute"],
};

/**
 * Returns the set of permissions granted to a role.
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Returns true if any of the provided roles has the required permission.
 */
export function hasPermission(roles: Role[], required: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(required));
}

// ── Input sanitisation ────────────────────────────────────────────────────────

/**
 * Strip HTML/script tags and trim whitespace from a user-supplied string.
 * Use before rendering user input in any context.
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>&"'`]/g, (c) => {
      const escapes: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#39;",
        "`": "&#96;",
      };
      return escapes[c] ?? c;
    })
    .trim();
}

// ── Token utilities ───────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random hex string of the given byte length.
 * Uses the Web Crypto API (globalThis.crypto) available in Node.js ≥ 19.
 */
export function generateToken(byteLength = 32): string {
  const buf = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time string comparison to guard against timing attacks.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export type { Role, Permission };
