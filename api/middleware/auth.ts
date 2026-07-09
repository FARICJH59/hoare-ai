import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-jwt-secret-not-for-production";
const API_KEYS = new Set((process.env.API_KEYS ?? "").split(",").filter(Boolean));

export interface AuthenticatedRequest extends Request {
  auth?: {
    type: "jwt" | "apikey";
    subject?: string;
    roles?: string[];
  };
}

/**
 * Middleware that accepts either a valid JWT ****** or a valid API key.
 * Attaches `req.auth` on success; returns 401 on failure.
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  const apiKeyHeader = req.headers["x-api-key"] as string | undefined;

  // API key check
  if (apiKeyHeader) {
    if (API_KEYS.size > 0 && API_KEYS.has(apiKeyHeader)) {
      req.auth = { type: "apikey" };
      next();
      return;
    }
    res.status(401).json({ error: "Invalid API key." });
    return;
  }

  // JWT ******
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      req.auth = {
        type: "jwt",
        subject: payload.sub,
        roles: Array.isArray(payload.roles) ? (payload.roles as string[]) : [],
      };
      next();
      return;
    } catch {
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }
  }

  // No credentials — in development allow unauthenticated access; in production deny
  if (process.env.NODE_ENV === "production") {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  next();
}

/** Helper to issue a signed JWT (for testing / token endpoints). */
export function issueToken(
  subject: string,
  roles: string[] = [],
  expiresIn: string | number = "8h"
): string {
  return jwt.sign({ sub: subject, roles }, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}
