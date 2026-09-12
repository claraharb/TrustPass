import "dotenv/config";
import prisma from "../config/prisma";
import { assessProtectedAction } from "../services/trustEngine.service";

async function main() {
  const protectedAction = await prisma.protectedAction.findFirst({
    where: {
      clientId: 2,
      name: "LOGIN",
      isActive: true,
    },
  });

  if (!protectedAction) {
    throw new Error("LOGIN protected action not found");
  }

  const assessment = await assessProtectedAction({
    protectedActionId: protectedAction.id,
    phoneNumber: "+96170123456",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0",
  });

  console.log(
    JSON.stringify(
      {
        protectedAction: protectedAction.name,
        assessment,
      },
      null,
      2
    )
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });