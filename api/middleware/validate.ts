import { Request, Response, NextFunction } from "express";

/**
 * Generic request body validator.
 * Accepts a list of required field names and returns 400 when any is absent.
 */
export function requireFields(...fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body) {
      res.status(400).json({ error: "Request body is required." });
      return;
    }
    const missing = fields.filter(
      (f) => body[f] === undefined || body[f] === null || body[f] === ""
    );
    if (missing.length > 0) {
      res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}.` });
      return;
    }
    next();
  };
}

/**
 * Ensures the Content-Type header is application/json for mutation requests.
 */
export function requireJson(req: Request, res: Response, next: NextFunction): void {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const ct = req.headers["content-type"] ?? "";
    if (!ct.includes("application/json")) {
      res.status(415).json({ error: "Content-Type must be application/json." });
      return;
    }
  }
  next();
}
