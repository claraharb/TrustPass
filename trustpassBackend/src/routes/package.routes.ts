import { Router } from "express";
import { getAvailablePackages } from "../controllers/package.controller";

const router = Router();

router.get("/", getAvailablePackages);

export default router;