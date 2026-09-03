import { Router } from "express";

const router = Router();

router.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "trustpass-backend",
        message: "TrustPass backend is running"
    });
});

export default router;