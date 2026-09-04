import { Router } from "express";

import {
    authenticate,
    authorize,
} from "../middleware/auth.middleware";

import {
    getClients,
    createClient,
    updateClient,
    activateClient,
    deactivateClient,
    getClientDetails,
    createPackage,
    updatePackage,
    deactivatePackage,
} from "../controllers/admin.controller";

const router = Router();

router.get(
    "/clients",
    authenticate,
    authorize("ADMIN"),
    getClients
);

router.get(
    "/clients/:id",
    authenticate,
    authorize("ADMIN"),
    getClientDetails
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

router.patch(
    "/clients/:id/activate",
    authenticate,
    authorize("ADMIN"),
    activateClient
);

router.patch(
    "/clients/:id/deactivate",
    authenticate,
    authorize("ADMIN"),
    deactivateClient
);

router.post(
    "/packages",
    authenticate,
    authorize("ADMIN"),
    createPackage
);

router.put(
    "/packages/:id",
    authenticate,
    authorize("ADMIN"),
    updatePackage
);

router.patch(
    "/packages/:id/deactivate",
    authenticate,
    authorize("ADMIN"),
    deactivatePackage
);

export default router;