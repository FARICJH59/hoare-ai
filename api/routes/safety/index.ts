import { Router } from "express";
import { body, ok } from "../respond";
import { evaluateSafety } from "../../../core/safety/engine";
import { listSafetyPolicies } from "../../../core/safety/policies";
export const safetyPhaseRouter = Router();
safetyPhaseRouter.post("/safety/evaluate", async (req, res, next) => { try { ok(res, evaluateSafety(body(req))); } catch (error) { next(error); } });
safetyPhaseRouter.get("/safety/policies", async (req, res, next) => { try { ok(res, listSafetyPolicies()); } catch (error) { next(error); } });
