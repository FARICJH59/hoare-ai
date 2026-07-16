import { Router } from "express";
import { ok } from "../respond";
import { listLogs } from "../../../core/observability/logger";
import { listTraces } from "../../../core/observability/traces";
import { listMetrics } from "../../../core/observability/metrics";
export const observabilityPhaseRouter = Router();
observabilityPhaseRouter.get("/observability/logs", async (req, res, next) => { try { ok(res, listLogs()); } catch (error) { next(error); } });
observabilityPhaseRouter.get("/observability/traces", async (req, res, next) => { try { ok(res, listTraces()); } catch (error) { next(error); } });
observabilityPhaseRouter.get("/observability/metrics", async (req, res, next) => { try { ok(res, listMetrics()); } catch (error) { next(error); } });
