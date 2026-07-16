
import { Router } from "express";
import { body, ok } from "../../respond";
import { deployUseCase, activateUseCase, deactivateUseCase, listDeployments } from "../../../../core/usecases/deployment/engine";
export const usecaseDeploymentPhaseRouter = Router();
usecaseDeploymentPhaseRouter.post("/usecases/deployment/deploy", (req, res) => ok(res, deployUseCase(body(req))));
usecaseDeploymentPhaseRouter.post("/usecases/deployment/activate", (req, res) => ok(res, activateUseCase(body(req))));
usecaseDeploymentPhaseRouter.post("/usecases/deployment/deactivate", (req, res) => ok(res, deactivateUseCase(body(req))));
usecaseDeploymentPhaseRouter.get("/usecases/deployment/list", (_req, res) => ok(res, listDeployments()));
