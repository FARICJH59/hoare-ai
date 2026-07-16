import { Router } from "express";
import { body, ok } from "../respond";
import { broadcastMessage, getMailbox, sendMessage } from "../../../core/messaging/engine";
export const messagingPhaseRouter = Router();
messagingPhaseRouter.post("/messaging/send", async (req, res, next) => { try { ok(res, sendMessage(String(body(req).to ?? "agents.hoare-analyst"), body(req))); } catch (error) { next(error); } });
messagingPhaseRouter.post("/messaging/broadcast", async (req, res, next) => { try { ok(res, broadcastMessage(Array.isArray(body(req).recipients) ? body(req).recipients.map(String) : ["agents.hoare-analyst"], body(req))); } catch (error) { next(error); } });
messagingPhaseRouter.get("/messaging/mailbox", async (req, res, next) => { try { ok(res, getMailbox(String(req.query.agentId ?? "agents.hoare-analyst"))); } catch (error) { next(error); } });
