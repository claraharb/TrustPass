import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

const createSubscriptionSchema = z.object({
    packageId: z.number().int().positive("Invalid package ID"),
});

export async function createSubscription(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.user?.clientId) {
            return res.status(401).json({
                message: "Client authentication required",
            });
        }

        const clientId = req.user.clientId;

        const validation = createSubscriptionSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validation.error.issues,
            });
        }

        const { packageId } = validation.data;

        const client = await prisma.client.findUnique({
            where: { id: clientId },
        });

        if (!client) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        if (!client.isActive) {
            return res.status(403).json({
                message: "Client account is inactive",
            });
        }

        const packageData = await prisma.package.findUnique({
            where: { id: packageId },
        });

        if (!packageData) {
            return res.status(404).json({
                message: "Package not found",
            });
        }

        if (!packageData.isActive) {
            return res.status(400).json({
                message: "Package is not available",
            });
        }

        const existingSubscription = await prisma.subscription.findFirst({
            where: {
                clientId,
                isActive: true,
                endDate: {
                    gt: new Date(),
                },
            },
        });

        if (existingSubscription) {
            return res.status(409).json({
                message: "Client already has an active subscription",
            });
        }

        const startDate = new Date();

        const endDate = new Date(startDate);
        endDate.setDate(
            endDate.getDate() + packageData.durationDays
        );

        const subscription = await prisma.subscription.create({
            data: {
                clientId,
                packageId,
                startDate,
                endDate,
                requestsUsed: 0,
                isActive: true,
                paymentStatus: "SIMULATED",
            },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                requestsUsed: true,
                isActive: true,
                paymentStatus: true,
                package: {
                    select: {
                        id: true,
                        name: true,
                        requestLimit: true,
                        price: true,
                        durationDays: true,
                        features: true,
                    },
                },
            },
        });

        return res.status(201).json({
            message: "Subscription created successfully",
            subscription,
        });
    } catch (error) {
        console.error("Failed to create subscription:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function getCurrentSubscription(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.user?.clientId) {
            return res.status(401).json({
                message: "Client authentication required",
            });
        }

        const clientId = req.user.clientId;

        const subscription = await prisma.subscription.findFirst({
            where: {
                clientId,
                isActive: true,
                endDate: {
                    gt: new Date(),
                },
            },
            orderBy: {
                endDate: "desc",
            },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                requestsUsed: true,
                isActive: true,
                paymentStatus: true,
                package: {
                    select: {
                        id: true,
                        name: true,
                        requestLimit: true,
                        price: true,
                        durationDays: true,
                        features: true,
                    },
                },
            },
        });

        if (!subscription) {
            return res.status(404).json({
                message: "No active subscription found",
            });
        }

        const remainingRequests = Math.max(
            subscription.package.requestLimit - subscription.requestsUsed,
            0
        );

        return res.status(200).json({
            subscription,
            remainingRequests,
        });
    } catch (error) {
        console.error("Failed to retrieve current subscription:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
export async function getSubscriptionUsage(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.user?.clientId) {
            return res.status(401).json({
                message: "Client authentication required",
            });
        }

        const clientId = req.user.clientId;

        const subscription = await prisma.subscription.findFirst({
            where: {
                clientId,
                isActive: true,
                endDate: {
                    gt: new Date(),
                },
            },
            orderBy: {
                endDate: "desc",
            },
            select: {
                id: true,
                requestsUsed: true,
                startDate: true,
                endDate: true,
                package: {
                    select: {
                        id: true,
                        name: true,
                        requestLimit: true,
                    },
                },
            },
        });

        if (!subscription) {
            return res.status(404).json({
                message: "No active subscription found",
            });
        }

        const requestLimit = subscription.package.requestLimit;

        const remainingRequests = Math.max(
            requestLimit - subscription.requestsUsed,
            0
        );

        const usagePercentage =
            requestLimit > 0
                ? Math.min(
                    (subscription.requestsUsed / requestLimit) * 100,
                    100
                )
                : 0;

        return res.status(200).json({
            usage: {
                subscriptionId: subscription.id,
                packageName: subscription.package.name,
                requestLimit,
                requestsUsed: subscription.requestsUsed,
                remainingRequests,
                usagePercentage,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
            },
        });
    } catch (error) {
        console.error("Failed to retrieve subscription usage:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}