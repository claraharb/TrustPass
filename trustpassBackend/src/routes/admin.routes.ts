import { Router } from "express";
import { getDashboard } from "../controllers/admin.controller";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";

const router = Router();

router.get("/dashboard", authenticate, requireAdmin, getDashboard);

export default router;
