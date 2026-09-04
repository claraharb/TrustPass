import { Router } from "express";
import {
    registerClient,
    loginClient,
} from "../controllers/auth.controller";

const router = Router();

router.post("/client/register", registerClient);
router.post("/client/login", loginClient);

export default router;