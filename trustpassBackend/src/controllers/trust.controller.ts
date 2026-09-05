import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { validateApiKey } from "../services/apiKey.service";

const trustCheckSchema = z.object({
  action: z.string().min(1),
  phoneNumber: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export async function trustCheck(req: Request, res: Response) {
  try {
    // 1. Receive API key
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(401).json({
        message: "API key is required",
      });
    }

    // 2. Validate API key
    const validatedKey = await validateApiKey(apiKey);

    if (!validatedKey) {
      return res.status(401).json({
        message: "Invalid or inactive API key",
      });
    }

    // 3. Validate request body
    const parsed = trustCheckSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: parsed.error.flatten(),
      });
    }

    const {
      action,
      phoneNumber,
      ipAddress,
      userAgent,
    } = parsed.data;

    // 4. Identify protected action
    const protectedAction = await prisma.protectedAction.findFirst({
      where: {
        clientId: validatedKey.clientId,
        name: action,
        isActive: true,
      },
    });

    if (!protectedAction) {
      return res.status(404).json({
        message: "Protected action not found or inactive",
      });
    }

    // 5. Create initial trust request
    const requestId = `TR-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const trustRequest = await prisma.trustRequest.create({
      data: {
        clientId: validatedKey.clientId,
        protectedActionId: protectedAction.id,
        requestId,
        phoneNumber,
        ipAddress,
        userAgent,
        status: "PENDING",
      },
    });

    return res.status(202).json({
      requestId: trustRequest.requestId,
      status: trustRequest.status,
      message: "Trust assessment created",
    });
  } catch (error) {
    console.error("Trust check failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}