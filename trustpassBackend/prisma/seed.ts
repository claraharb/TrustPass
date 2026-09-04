import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/config/prisma";



async function main() {
    const passwordHash = await bcrypt.hash("AdminPassword123", 12);

    const admin = await prisma.admin.upsert({
        where: {
            email: "admin@trustpass.com",
        },
        update: {},
        create: {
            name: "TrustPass Admin",
            email: "admin@trustpass.com",
            passwordHash,
        },
    });

    console.log("Admin created:", {
        id: admin.id,
        email: admin.email,
    });
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });