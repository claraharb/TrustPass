import "dotenv/config";

import prisma from "../config/prisma";


async function main() {

  console.log(
    "========================================"
  );

  console.log(
    "TrustPass OTP Request History"
  );

  console.log(
    "========================================"
  );


  const requests =
    await prisma.trustRequest.findMany({

      where: {

        clientId: 2,

        protectedAction: {
          name: "OTP_REQUEST",
        },
      },


      orderBy: {

        createdAt:
          "desc",
      },


      take: 20,


      select: {

        id: true,

        requestId: true,

        phoneNumber: true,

        ipAddress: true,

        createdAt: true,

        status: true,


        trustDecision: {

          select: {

            trustScore: true,

            riskLevel: true,

            decision: true,
          },
        },
      },
    });


  console.log(
    JSON.stringify(
      requests,
      null,
      2
    )
  );


  console.log(
    "========================================"
  );

  console.log(
    `Total displayed: ${requests.length}`
  );

  console.log(
    "========================================"
  );
}


main()

  .catch(
    (error) => {

      console.error(
        "Failed to retrieve OTP history:",
        error
      );

      process.exit(
        1
      );
    }
  )

  .finally(
    async () => {

      await prisma.$disconnect();
    }
  );