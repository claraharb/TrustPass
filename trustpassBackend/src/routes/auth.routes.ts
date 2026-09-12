import { Router } from "express";
import {
  registerClient,
  loginClient,
  logoutClient,
  loginAdmin,
} from "../controllers/auth.controller";

const router = Router();

router.post("/admin/login", loginAdmin);
router.post("/client/register", registerClient);
router.post("/client/login", loginClient);
router.post("/client/logout", logoutClient);

export default router;
