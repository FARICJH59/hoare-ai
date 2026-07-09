import { Request, Response, NextFunction } from "express";

/**
 * Applies a standard set of security response headers to every request.
 * Mirrors the headers declared in vercel.json for consistency.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; object-src 'none';"
  );
  // Remove potentially revealing headers
  res.removeHeader("X-Powered-By");
  next();
}
