import { Router } from "express";
import { trustCheck } from "../controllers/trust.controller";

const router = Router();

router.post("/check", trustCheck);

export default router;