import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { recordApiUsage } from "../services/apiUsage.service";
import { generateApiKey, validateApiKey } from "../services/apiKey.service";
import crypto from "crypto";

export async function createApiKey(
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

        const client = await prisma.client.findUnique({
            where: {
                id: clientId,
            },
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

        const { rawKey, keyHash, keyPrefix } = generateApiKey();

        const apiKey = await prisma.apiKey.create({
            data: {
                clientId,
                keyPrefix,
                keyHash,
                status: "ACTIVE",
            },
            select: {
                id: true,
                keyPrefix: true,
                status: true,
                createdAt: true,
            },
        });

        return res.status(201).json({
            message: "API key generated successfully",
            apiKey: {
                ...apiKey,
                key: rawKey,
            },
        });
    } catch (error) {
        console.error("Failed to generate API key:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function getApiKeys(
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

        const apiKeys = await prisma.apiKey.findMany({
            where: {
                clientId,
            },
            select: {
                id: true,
                keyPrefix: true,
                status: true,
                createdAt: true,
                lastUsedAt: true,
                revokedAt: true,
                usageCount: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return res.status(200).json({
            apiKeys,
        });
    } catch (error) {
        console.error("Failed to retrieve API keys:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function testApiKeyValidation(
    req: Request,
    res: Response
) {
    try {
        const apiKey = req.headers["x-api-key"];

        if (typeof apiKey !== "string" || !apiKey) {
            return res.status(401).json({
                message: "API key required",
            });
        }

        const validatedKey = await validateApiKey(apiKey);

        if (!validatedKey) {
            return res.status(401).json({
                message: "Invalid or inactive API key",
            });
        }

        return res.status(200).json({
            message: "API key is valid",
            apiKey: {
                id: validatedKey.id,
                keyPrefix: validatedKey.keyPrefix,
                status: validatedKey.status,
            },
            client: validatedKey.client,
        });
    } catch (error) {
        console.error("Failed to validate API key:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function revokeApiKey(
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
        const apiKeyId = Number(req.params.id);

        if (!Number.isInteger(apiKeyId) || apiKeyId <= 0) {
            return res.status(400).json({
                message: "Invalid API key ID",
            });
        }

        const apiKey = await prisma.apiKey.findFirst({
            where: {
                id: apiKeyId,
                clientId,
            },
        });

        if (!apiKey) {
            return res.status(404).json({
                message: "API key not found",
            });
        }

        if (apiKey.status === "REVOKED") {
            return res.status(400).json({
                message: "API key is already revoked",
            });
        }

        const revokedApiKey = await prisma.apiKey.update({
            where: {
                id: apiKeyId,
            },
            data: {
                status: "REVOKED",
                revokedAt: new Date(),
            },
            select: {
                id: true,
                keyPrefix: true,
                status: true,
                createdAt: true,
                revokedAt: true,
            },
        });

        return res.status(200).json({
            message: "API key revoked successfully",
            apiKey: revokedApiKey,
        });
    } catch (error) {
        console.error("Failed to revoke API key:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function rotateApiKey(
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
        const apiKeyId = Number(req.params.id);

        if (!Number.isInteger(apiKeyId) || apiKeyId <= 0) {
            return res.status(400).json({
                message: "Invalid API key ID",
            });
        }

        const existingApiKey = await prisma.apiKey.findFirst({
            where: {
                id: apiKeyId,
                clientId,
            },
        });

        if (!existingApiKey) {
            return res.status(404).json({
                message: "API key not found",
            });
        }

        if (existingApiKey.status !== "ACTIVE") {
            return res.status(400).json({
                message: "Only an active API key can be rotated",
            });
        }

        const { rawKey, keyHash, keyPrefix } = generateApiKey();

        const [, result] = await prisma.$transaction([
            prisma.apiKey.update({
                where: {
                    id: apiKeyId,
                },
                data: {
                    status: "REVOKED",
                    revokedAt: new Date(),
                },
            }),
            prisma.apiKey.create({
                data: {
                    clientId,
                    keyPrefix,
                    keyHash,
                    status: "ACTIVE",
                },
                select: {
                    id: true,
                    keyPrefix: true,
                    status: true,
                    createdAt: true,
                },
            }),
        ]);

        return res.status(201).json({
            message: "API key rotated successfully",
            oldApiKeyId: existingApiKey.id,
            apiKey: {
                ...result,
                key: rawKey,
            },
        });
    } catch (error) {
        console.error("Failed to rotate API key:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
export async function testApiKeyUsage(
    req: Request,
    res: Response
) {
    try {
        const apiKeyHeader = req.headers["x-api-key"];

        if (typeof apiKeyHeader !== "string" || !apiKeyHeader) {
            return res.status(401).json({
                message: "API key required",
            });
        }

        const validatedKey = await validateApiKey(apiKeyHeader);

        if (!validatedKey) {
            return res.status(401).json({
                message: "Invalid or inactive API key",
            });
        }

        await recordApiUsage({
            clientId: validatedKey.clientId,
            apiKeyId: validatedKey.id,
            endpoint: req.originalUrl,
            method: req.method,
            statusCode: 200,
            requestId: crypto.randomUUID(),
        });

        return res.status(200).json({
            message: "API request recorded successfully",
            apiKey: {
                id: validatedKey.id,
                keyPrefix: validatedKey.keyPrefix,
            },
        });
    } catch (error) {
        console.error("Failed to record API usage:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}