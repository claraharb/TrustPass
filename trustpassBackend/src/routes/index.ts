import { Router } from "express";
import prisma from "../config/prisma";

const router = Router();

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

export default router;