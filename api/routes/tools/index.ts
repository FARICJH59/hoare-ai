import { Router } from "express";
import { body, ok } from "../respond";
import { listTools } from "../../../core/tools/registry";
import { executeTool } from "../../../core/tools/executor";
export const toolsPhaseRouter = Router();
toolsPhaseRouter.get("/tools/list", async (req, res, next) => { try { ok(res, listTools()); } catch (error) { next(error); } });
toolsPhaseRouter.post("/tools/execute", async (req, res, next) => { try { ok(res, await executeTool(body(req))); } catch (error) { next(error); } });
