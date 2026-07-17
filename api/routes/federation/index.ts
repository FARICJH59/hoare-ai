import { Router } from "express";
import { body, ok } from "../respond";
import { createFederation, getFederationState, listFederations, runFederation } from "../../../core/federation/engine";
export const federationPhaseRouter = Router();
federationPhaseRouter.post("/federation/create", async (req, res, next) => { try { ok(res, createFederation(body(req))); } catch (error) { next(error); } });
federationPhaseRouter.post("/federation/run", async (req, res, next) => { try { ok(res, await runFederation(body(req))); } catch (error) { next(error); } });
federationPhaseRouter.get("/federation/list", async (req, res, next) => { try { ok(res, listFederations()); } catch (error) { next(error); } });
federationPhaseRouter.get("/federation/state", async (req, res, next) => { try { ok(res, getFederationState()); } catch (error) { next(error); } });
