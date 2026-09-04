import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
    user?: {
        clientId?: number;
        adminId?: number;
        role: "CLIENT" | "ADMIN";
    };
}

export function authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET!
        ) as {
            clientId?: number;
            adminId?: number;
            role: "CLIENT" | "ADMIN";
        };

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
}