
import { Router } from "express";
import { ok } from "../respond";
import { listPacks, getPack } from "../../../core/usecases/packs/registry";
import { installPack } from "../../../core/usecases/packs/engine";
export const usecasePacksPhaseRouter = Router();
usecasePacksPhaseRouter.get("/usecases/packs/list", (_req, res) => ok(res, listPacks()));
usecasePacksPhaseRouter.get("/usecases/packs/get", (req, res) => ok(res, getPack(String(req.query.id ?? ""))));
usecasePacksPhaseRouter.post("/usecases/packs/install", (req, res) => ok(res, installPack(String(req.body?.packName ?? ""))));
