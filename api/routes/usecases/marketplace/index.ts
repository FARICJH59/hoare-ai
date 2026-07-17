
import { Router } from "express";
import { body, ok } from "../../respond";
import { getMarketplaceItem, listMarketplaceItems, searchMarketplace, installMarketplaceItem, publishItem, rateItem } from "../../../../core/usecases/marketplace/engine";
export const usecaseMarketplacePhaseRouter = Router();
usecaseMarketplacePhaseRouter.get("/usecases/marketplace/list", (_req, res) => ok(res, listMarketplaceItems()));
usecaseMarketplacePhaseRouter.get("/usecases/marketplace/get", (req, res) => ok(res, getMarketplaceItem(String(req.query.id ?? ""))));
usecaseMarketplacePhaseRouter.get("/usecases/marketplace/search", (req, res) => ok(res, searchMarketplace(String(req.query.q ?? ""))));
usecaseMarketplacePhaseRouter.post("/usecases/marketplace/publish", (req, res) => ok(res, publishItem(body(req))));
usecaseMarketplacePhaseRouter.post("/usecases/marketplace/install", (req, res) => ok(res, installMarketplaceItem(body(req))));
usecaseMarketplacePhaseRouter.post("/usecases/marketplace/rate", (req, res) => ok(res, rateItem(body(req))));
