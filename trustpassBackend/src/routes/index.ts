import { Router } from "express";
import prisma from "../config/prisma";
import authRoutes from "./auth.routes";
import adminRoutes from "./admin.routes";
import packageRoutes from "./package.routes";
import subscriptionRoutes from "./subscription.routes";
import apiKeyRoutes from "./apiKey.routes";
import trustRoutes from "./trust.routes";
import clientRoutes from "./client.routes";
import numberVerificationRoutes from "./numberVerification.routes";

import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/packages", packageRoutes);
router.use("/client/subscriptions", subscriptionRoutes);
router.use("/client/api-keys", apiKeyRoutes);
router.use("/trust", trustRoutes);
router.use("/client", clientRoutes);
router.use(
  "/camara/number-verification",
  numberVerificationRoutes
);

router.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "ok",
      service: "trustpass-backend",
      database: "connected",
      message: "TrustPass backend is running",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "error",
      service: "trustpass-backend",
      database: "disconnected",
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
  },
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
  },
);

export default router;
