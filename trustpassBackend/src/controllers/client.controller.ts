import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { revokeToken } from "../services/token.service";

const updateAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
});

export async function updateAccount(req: AuthenticatedRequest, res: Response) {
  try {
    const clientId = req.user?.clientId;
    if (!clientId) {
      return res
        .status(401)
        .json({ message: "Client authentication required" });
    }

    const validation = updateAccountSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.issues,
      });
    }

    const { name, email, password } = validation.data;
    const existingClient = await prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!existingClient) {
      return res.status(404).json({ message: "Client account not found" });
    }

    if (email && email !== existingClient.email) {
      const emailAlreadyUsed = await prisma.client.findUnique({
        where: { email },
      });
      if (emailAlreadyUsed) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists" });
      }
    }

    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(name === undefined ? {} : { name }),
        ...(email === undefined ? {} : { email }),
        ...(password === undefined
          ? {}
          : { passwordHash: await bcrypt.hash(password, 12) }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res
      .status(200)
      .json({ message: "Client account updated successfully", client });
  } catch (error) {
    console.error("Failed to update client account:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteAccount(req: AuthenticatedRequest, res: Response) {
  try {
    const clientId = req.user?.clientId;
    if (!clientId) {
      return res
        .status(401)
        .json({ message: "Client authentication required" });
    }

    const existingClient = await prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!existingClient) {
      return res.status(404).json({ message: "Client account not found" });
    }

    const trustRequests = await prisma.trustRequest.findMany({
      where: { clientId },
      select: { id: true },
    });
    const trustRequestIds = trustRequests.map(
      (request: { id: number }) => request.id,
    );

    await prisma.$transaction([
      prisma.fraudEvent.deleteMany({
        where: {
          OR: [
            { clientId },
            ...(trustRequestIds.length > 0
              ? [{ trustRequestId: { in: trustRequestIds } }]
              : []),
          ],
        },
      }),
      prisma.trustDecision.deleteMany({
        where: { trustRequestId: { in: trustRequestIds } },
      }),
      prisma.riskSignal.deleteMany({
        where: { trustRequestId: { in: trustRequestIds } },
      }),
      prisma.trustRequest.deleteMany({
        where: { id: { in: trustRequestIds } },
      }),
      prisma.apiUsage.deleteMany({ where: { clientId } }),
      prisma.apiKey.deleteMany({ where: { clientId } }),
      prisma.subscription.deleteMany({ where: { clientId } }),
      prisma.protectedAction.deleteMany({ where: { clientId } }),
      prisma.client.delete({ where: { id: clientId } }),
    ]);

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      revokeToken(authHeader.split(" ")[1]);
    }

    return res
      .status(200)
      .json({ message: "Client account deleted successfully" });
  } catch (error) {
    console.error("Failed to delete client account:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
