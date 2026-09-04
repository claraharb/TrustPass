import { Router } from "express";

import {
    authenticate,
    authorize,
} from "../middleware/auth.middleware";

import {
    getClients,
    createClient,
    updateClient,
} from "../controllers/admin.controller";

const router = Router();

router.get(
    "/clients",
    authenticate,
    authorize("ADMIN"),
    getClients
);

router.post(
    "/clients",
    authenticate,
    authorize("ADMIN"),
    createClient
);

router.put(
    "/clients/:id",
    authenticate,
    authorize("ADMIN"),
    updateClient
);

export default router;