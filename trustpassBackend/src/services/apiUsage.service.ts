import prisma from "../config/prisma";

interface RecordApiUsageParams {
    clientId: number;
    apiKeyId: number;
    endpoint: string;
    method: string;
    statusCode: number;
    requestId?: string;
}

export async function recordApiUsage({
    clientId,
    apiKeyId,
    endpoint,
    method,
    statusCode,
    requestId,
}: RecordApiUsageParams) {
    await prisma.$transaction([
        prisma.apiUsage.create({
            data: {
                clientId,
                apiKeyId,
                endpoint,
                method,
                statusCode,
                requestId,
            },
        }),

        prisma.apiKey.update({
            where: {
                id: apiKeyId,
            },
            data: {
                usageCount: {
                    increment: 1,
                },
                lastUsedAt: new Date(),
            },
        }),
    ]);
}