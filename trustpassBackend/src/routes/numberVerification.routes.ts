import { Router } from "express";
import {
  startNumberVerification,
  numberVerificationCallback,
} from "../controllers/numberVerification.controller";

const router = Router();

router.get("/start", startNumberVerification);

router.get("/callback", numberVerificationCallback);

export default router;