import "dotenv/config";
import prisma from "../config/prisma";
import {
  calculateTrustDecision,
  saveTrustDecision,
} from "../services/trustDecision.service";

async function main() {
  const trustRequest = await prisma.trustRequest.findFirst({
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!trustRequest) {
    throw new Error("No trust request found");
  }

  console.log("Testing TrustRequest:", trustRequest.requestId);

  const result = await calculateTrustDecision(trustRequest.id);

  console.log("\nCalculated decision:");
  console.log(JSON.stringify(result, null, 2));

  const savedDecision = await saveTrustDecision(
    trustRequest.id,
    result
  );

  console.log("\nSaved TrustDecision:");
  console.log(JSON.stringify(savedDecision, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });