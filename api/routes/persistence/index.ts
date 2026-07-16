import { Router } from "express";
import { body, ok } from "../respond";
import { deleteRecord, getRecord, listRecords, setRecord } from "../../../core/persistence/engine";
export const persistencePhaseRouter = Router();
persistencePhaseRouter.get("/persistence/get", async (req, res, next) => { try { ok(res, getRecord(String(req.query.key ?? ""))); } catch (error) { next(error); } });
persistencePhaseRouter.post("/persistence/set", async (req, res, next) => { try { ok(res, setRecord(String(body(req).key ?? ""), body(req))); } catch (error) { next(error); } });
persistencePhaseRouter.post("/persistence/delete", async (req, res, next) => { try { ok(res, deleteRecord(String(body(req).key ?? ""))); } catch (error) { next(error); } });
persistencePhaseRouter.get("/persistence/list", async (req, res, next) => { try { ok(res, listRecords()); } catch (error) { next(error); } });
