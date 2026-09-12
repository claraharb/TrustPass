import "dotenv/config";
import prisma from "../config/prisma";

async function main() {
  const request = await prisma.trustRequest.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      protectedAction: {
        select: {
          id: true,
          name: true,
          riskLevel: true,
        },
      },
      riskSignals: true,
      trustDecision: true,
    },
  });

  console.log(
    JSON.stringify(request, null, 2)
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });