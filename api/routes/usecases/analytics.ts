
import { Router } from "express";
import { body, ok } from "../respond";
import { recordAnalytics, listTelemetry, getUseCaseMetrics, getUseCaseInsights } from "../../../core/usecases/analytics/engine";
export const usecaseAnalyticsPhaseRouter = Router();
usecaseAnalyticsPhaseRouter.get("/usecases/analytics/events", (_req, res) => ok(res, listTelemetry()));
usecaseAnalyticsPhaseRouter.get("/usecases/analytics/metrics", (_req, res) => ok(res, getUseCaseMetrics()));
usecaseAnalyticsPhaseRouter.get("/usecases/analytics/insights", (_req, res) => ok(res, getUseCaseInsights()));
usecaseAnalyticsPhaseRouter.post("/usecases/analytics/record", (req, res) => ok(res, recordAnalytics(body(req))));
