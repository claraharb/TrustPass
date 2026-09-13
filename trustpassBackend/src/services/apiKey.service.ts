import crypto from "crypto";
import prisma from "../config/prisma";

export function generateApiKey() {
  const rawKey = `tp_live_${crypto.randomBytes(32).toString("hex")}`;

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const keyPrefix = rawKey.substring(0, 12);

  return {
    rawKey,
    keyHash,
    keyPrefix,
  };
}

export async function validateApiKey(rawKey: string) {
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: {
      keyHash,
    },
    select: {
      id: true,
      clientId: true,
      keyPrefix: true,
      status: true,
      usageCount: true,
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
        },
      },
    },
  });

  if (!apiKey) {
    return null;
  }

  if (apiKey.status !== "ACTIVE") {
    return null;
  }

  if (!apiKey.client.isActive) {
    return null;
  }

  return apiKey;
}