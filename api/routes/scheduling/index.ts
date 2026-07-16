import { Router } from "express";
import { body, ok } from "../respond";
import { cancelScheduledTask, scheduleTask } from "../../../core/scheduling/engine";
import { listTasks } from "../../../core/scheduling/registry";
export const schedulingPhaseRouter = Router();
schedulingPhaseRouter.post("/scheduling/schedule", async (req, res, next) => { try { ok(res, scheduleTask(body(req))); } catch (error) { next(error); } });
schedulingPhaseRouter.post("/scheduling/cancel", async (req, res, next) => { try { ok(res, cancelScheduledTask(String(body(req).id ?? ""))); } catch (error) { next(error); } });
schedulingPhaseRouter.get("/scheduling/list", async (req, res, next) => { try { ok(res, listTasks()); } catch (error) { next(error); } });
