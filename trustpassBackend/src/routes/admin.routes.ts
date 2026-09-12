import { Router } from "express";

import { authenticate, authorize } from "../middleware/auth.middleware";

import {
  getClients,
  getClientDetails,
  createPackage,
  updatePackage,
  deactivatePackage,
  getDashboard,
} from "../controllers/admin.controller";

const router = Router();

router.get("/clients", authenticate, authorize("ADMIN"), getClients);

router.get("/dashboard", authenticate, authorize("ADMIN"), getDashboard);

router.get("/clients/:id", authenticate, authorize("ADMIN"), getClientDetails);

router.post("/packages", authenticate, authorize("ADMIN"), createPackage);

router.put("/packages/:id", authenticate, authorize("ADMIN"), updatePackage);

router.patch(
  "/packages/:id/deactivate",
  authenticate,
  authorize("ADMIN"),
  deactivatePackage,
);

export default router;
