import { Router } from "express";
import {
    authenticate,
    authorize,
} from "../middleware/auth.middleware";

import {
    createSubscription,
    getCurrentSubscription,
    getSubscriptionUsage,
} from "../controllers/subscription.controller";

const router = Router();

router.post(
    "/",
    authenticate,
    authorize("CLIENT"),
    createSubscription
);

router.get(
    "/current",
    authenticate,
    authorize("CLIENT"),
    getCurrentSubscription
);

router.get(
    "/usage",
    authenticate,
    authorize("CLIENT"),
    getSubscriptionUsage
);

export default router;