
import { Router } from "express";
import { body, ok } from "../respond";
import { createSnapshot, restoreSnapshot, listSnapshots } from "../../../core/persistence/snapshot";
export const persistenceSnapshotPhaseRouter = Router();
persistenceSnapshotPhaseRouter.post("/persistence/snapshot/create", (req, res) => ok(res, createSnapshot(body(req))));
persistenceSnapshotPhaseRouter.post("/persistence/snapshot/restore", (req, res) => ok(res, restoreSnapshot(String(body(req).id ?? ""))));
persistenceSnapshotPhaseRouter.get("/persistence/snapshot/list", (_req, res) => ok(res, listSnapshots()));
