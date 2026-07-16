import { Router } from "express";
import { body, ok } from "../respond";
import { listUseCases } from "../../../core/usecases/registry";
import { runUseCase } from "../../../core/usecases/engine";
export const usecasesPhaseRouter = Router();
usecasesPhaseRouter.get("/usecases/list", async (req, res, next) => { try { ok(res, listUseCases()); } catch (error) { next(error); } });
usecasesPhaseRouter.post("/usecases/run", async (req, res, next) => { try { ok(res, await runUseCase(body(req))); } catch (error) { next(error); } });
