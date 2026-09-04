import { Router } from "express";
import {
    registerClient,
    loginClient,
    logoutClient,
} from "../controllers/auth.controller";

const router = Router();

router.post("/client/register", registerClient);
router.post("/client/login", loginClient);
router.post("/client/logout", logoutClient);
export default router;