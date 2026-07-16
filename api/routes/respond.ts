
import type { Request, Response } from "express";
export function body(req: Request) { return typeof req.body === "object" && req.body !== null ? req.body : {}; }
export function ok(res: Response, payload: unknown) { res.json(payload); }
