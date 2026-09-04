import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { isTokenRevoked } from "../services/token.service";

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
        if (isTokenRevoked(token)) {
            return res.status(401).json({
                message: "Token has been revoked",
             });
        }

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
export function authorize(...allowedRoles: Array<"CLIENT" | "ADMIN">) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    next();
  };
}