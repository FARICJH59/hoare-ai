
import { Router } from "express";
import { body, ok } from "../respond";
import { createVersion, rollbackVersion, listVersions, generateDiff } from "../../../core/usecases/versioning/engine";
export const usecaseVersioningPhaseRouter = Router();
usecaseVersioningPhaseRouter.get("/usecases/versioning/list", (_req, res) => ok(res, listVersions()));
usecaseVersioningPhaseRouter.get("/usecases/versioning/get", (_req, res) => ok(res, listVersions().items.at(-1) ?? null));
usecaseVersioningPhaseRouter.post("/usecases/versioning/create", (req, res) => ok(res, createVersion(body(req))));
usecaseVersioningPhaseRouter.post("/usecases/versioning/rollback", (req, res) => ok(res, rollbackVersion(body(req))));
usecaseVersioningPhaseRouter.get("/usecases/versioning/diff", (_req, res) => ok(res, generateDiff()));
