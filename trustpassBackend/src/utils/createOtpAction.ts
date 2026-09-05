import "dotenv/config";
import prisma from "../config/prisma";

async function main() {
  const clientId = 2;

  const existingAction = await prisma.protectedAction.findFirst({
    where: {
      clientId,
      name: "OTP_REQUEST",
    },
  });

  if (existingAction) {
    console.log("OTP_REQUEST already exists:");
    console.log(JSON.stringify(existingAction, null, 2));
    return;
  }

  const action = await prisma.protectedAction.create({
    data: {
      clientId,
      name: "OTP_REQUEST",
      description: "Request a one-time password during user signup.",
      riskLevel: "HIGH",
      isActive: true,
    },
  });

  console.log("OTP_REQUEST created:");
  console.log(JSON.stringify(action, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });