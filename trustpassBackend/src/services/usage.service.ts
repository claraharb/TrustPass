import prisma from "../config/prisma";

export async function getActiveSubscription(clientId: number) {
  return prisma.subscription.findFirst({
    where: {
      clientId,
      isActive: true,
      paymentStatus: "SIMULATED",
      endDate: {
        gte: new Date(),
      },
    },
    include: {
      package: true,
    },
    orderBy: {
      endDate: "desc",
    },
  });
}

export async function checkRequestLimit(clientId: number) {
  const subscription = await getActiveSubscription(clientId);

  if (!subscription) {
    return {
      allowed: false,
      reason: "No active subscription",
      subscription: null,
      remainingRequests: 0,
    };
  }

  const remainingRequests = Math.max(
    0,
    subscription.package.requestLimit - subscription.requestsUsed
  );

  return {
    allowed: remainingRequests > 0,
    reason:
      remainingRequests > 0
        ? "Request allowed"
        : "Request limit reached",
    subscription,
    remainingRequests,
  };
}

export async function recordApiUsage(
  clientId: number,
  apiKeyId: number,
  endpoint: string,
  method: string,
  statusCode: number,
  requestId: string
) {
  const activeSubscription = await getActiveSubscription(clientId);
  const operations = [
    ...(activeSubscription
      ? [
          prisma.subscription.update({
            where: {
              id: activeSubscription.id,
            },
            data: {
              requestsUsed: {
                increment: 1,
              },
            },
          }),
        ]
      : []),
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
  ];

  const results = await prisma.$transaction(operations);
  return results[results.length - 1];
}