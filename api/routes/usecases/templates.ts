
import { Router } from "express";
import { ok } from "../respond";
import { listTemplates, getTemplate } from "../../../core/usecases/templates/registry";
export const usecaseTemplatesPhaseRouter = Router();
usecaseTemplatesPhaseRouter.get("/usecases/templates/list", (_req, res) => ok(res, listTemplates()));
usecaseTemplatesPhaseRouter.get("/usecases/templates/get", (req, res) => ok(res, getTemplate(String(req.query.id ?? ""))));
