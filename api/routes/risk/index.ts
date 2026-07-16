import { Router } from "express";
import { body, ok } from "../respond";
import { evaluateRisk } from "../../../core/risk/engine";
import { listRiskModels } from "../../../core/risk/models";
export const riskPhaseRouter = Router();
riskPhaseRouter.post("/risk/evaluate", async (req, res, next) => { try { ok(res, evaluateRisk(body(req))); } catch (error) { next(error); } });
riskPhaseRouter.get("/risk/models", async (req, res, next) => { try { ok(res, listRiskModels()); } catch (error) { next(error); } });
