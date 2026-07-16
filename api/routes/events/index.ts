import { Router } from "express";
import { body, ok } from "../respond";
import { listEvents, publishEvent } from "../../../core/events/bus";
import { getEventStream } from "../../../core/events/stream";
export const eventsPhaseRouter = Router();
eventsPhaseRouter.get("/events/list", async (req, res, next) => { try { ok(res, listEvents(String(req.query.domain ?? "") || undefined)); } catch (error) { next(error); } });
eventsPhaseRouter.get("/events/stream", async (req, res, next) => { try { ok(res, getEventStream()); } catch (error) { next(error); } });
eventsPhaseRouter.get("/events/stream/domain", async (req, res, next) => { try { ok(res, getEventStream(String(req.query.domain ?? "grid"))); } catch (error) { next(error); } });
eventsPhaseRouter.post("/events/publish", async (req, res, next) => { try { ok(res, publishEvent(String(body(req).type ?? "event.published"), body(req), String(body(req).domain ?? "") || undefined)); } catch (error) { next(error); } });
