import { Router } from "express";
import {
  loginAdmin,
  registerClient,
  loginClient,
  logoutClient,
} from "../controllers/auth.controller";

const router = Router();

router.post("/admin/login", loginAdmin);
router.post("/client/register", registerClient);
router.post("/client/login", loginClient);
router.post("/client/logout", logoutClient);
export default router;
