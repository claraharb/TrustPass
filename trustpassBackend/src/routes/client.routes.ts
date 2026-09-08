import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { deleteAccount, updateAccount } from "../controllers/client.controller";

const router = Router();

router.put("/account", authenticate, authorize("CLIENT"), updateAccount);
router.delete("/account", authenticate, authorize("CLIENT"), deleteAccount);

export default router;
