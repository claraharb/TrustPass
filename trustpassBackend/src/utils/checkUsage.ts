import "dotenv/config";
import prisma from "../config/prisma";

async function main() {
  const clientId = 2;

  const subscription = await prisma.subscription.findFirst({
    where: {
      clientId,
      isActive: true,
    },
    include: {
      package: true,
    },
    orderBy: {
      endDate: "desc",
    },
  });

  console.log("=== SUBSCRIPTION USAGE ===");

  if (!subscription) {
    console.log("No active subscription found.");
  } else {
    const remaining =
      subscription.package.requestLimit -
      subscription.requestsUsed;

    console.log(
      JSON.stringify(
        {
          subscriptionId: subscription.id,
          package: subscription.package.name,
          requestLimit: subscription.package.requestLimit,
          requestsUsed: subscription.requestsUsed,
          remainingRequests: remaining,
        },
        null,
        2
      )
    );
  }

  console.log("\n=== RECENT API USAGE ===");

  const usage = await prisma.apiUsage.findMany({
    where: {
      clientId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  console.log(JSON.stringify(usage, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });