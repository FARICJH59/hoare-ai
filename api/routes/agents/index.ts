import { Router } from "express";
import { body, ok } from "../respond";
import { runAgent } from "../../../core/agents/runtime";
import { listAgents } from "../../../core/agents/registry";
export const agentsPhaseRouter = Router();
agentsPhaseRouter.post("/agents/run", async (req, res, next) => { try { ok(res, await runAgent(body(req))); } catch (error) { next(error); } });
agentsPhaseRouter.get("/agents/list", async (req, res, next) => { try { ok(res, listAgents()); } catch (error) { next(error); } });
