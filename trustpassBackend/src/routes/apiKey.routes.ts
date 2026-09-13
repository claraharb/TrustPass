import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import {
  createApiKey,
  getApiKeys,
  testApiKeyValidation,
  revokeApiKey,
  rotateApiKey,
  testApiKeyUsage,
} from "../controllers/apiKey.controller";

const router = Router();

router.post("/", authenticate, authorize("CLIENT"), createApiKey);
router.get("/", authenticate, authorize("CLIENT"), getApiKeys);

router.get("/test-validation", testApiKeyValidation);

router.patch("/:id/revoke", authenticate, authorize("CLIENT"), revokeApiKey);

router.post("/:id/rotate", authenticate, authorize("CLIENT"), rotateApiKey);

router.get("/test-usage", testApiKeyUsage);

export default router;
