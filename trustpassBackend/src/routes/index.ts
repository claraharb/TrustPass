import { Router } from "express";
import prisma from "../config/prisma";
import authRoutes from "./auth.routes";

import {
    authenticate,
    authorize,
    AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();
router.use("/auth", authRoutes);
router.get("/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            status: "ok",
            service: "trustpass-backend",
            database: "connected",
            message: "TrustPass backend is running"
        });
    } catch (error) {
        console.error("Database connection failed:", error);

        res.status(500).json({
            status: "error",
            service: "trustpass-backend",
            database: "disconnected"
        });
    }
});

router.get(
    "/client/test",
    authenticate,
    authorize("CLIENT"),
    (req: AuthenticatedRequest, res) => {
        res.json({
            message: "You accessed a protected client route",
            user: req.user,
        });
    }
);

router.get(
    "/admin/test",
    authenticate,
    authorize("ADMIN"),
    (req: AuthenticatedRequest, res) => {
        res.json({
            message: "You accessed a protected admin route",
            user: req.user,
        });
    }
);

export default router;