import { Router } from "express";
import { body, ok } from "../respond";
import { runWorkflow } from "../../../core/workflows/engine";
import { listWorkflows } from "../../../core/workflows/registry";
export const workflowsPhaseRouter = Router();
workflowsPhaseRouter.post("/workflows/run", async (req, res, next) => { try { ok(res, await runWorkflow(body(req))); } catch (error) { next(error); } });
workflowsPhaseRouter.get("/workflows/list", async (req, res, next) => { try { ok(res, listWorkflows()); } catch (error) { next(error); } });
