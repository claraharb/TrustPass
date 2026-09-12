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

    const packages = [
        {
            name: "Starter",
            description: "A simple protection layer for early integrations.",
            requestLimit: 1000,
            price: 29.99,
            durationDays: 30,
            features: "Trust checks, API key management, basic risk signals",
        },
        {
            name: "Growth",
            description: "More capacity for applications scaling their trust workflows.",
            requestLimit: 10000,
            price: 99.99,
            durationDays: 30,
            features: "Trust checks, CAMARA signals, AI evidence selection, usage monitoring",
        },
        {
            name: "Enterprise",
            description: "High-volume protection for critical customer journeys.",
            requestLimit: 100000,
            price: 399.99,
            durationDays: 30,
            features: "All TrustPass signals, number verification, priority support",
        },
    ];

    for (const packageData of packages) {
        const seededPackage = await prisma.package.upsert({
            where: { name: packageData.name },
            update: {
                description: packageData.description,
                requestLimit: packageData.requestLimit,
                price: packageData.price,
                durationDays: packageData.durationDays,
                features: packageData.features,
                isActive: true,
            },
            create: packageData,
        });

        console.log("Package ready:", {
            id: seededPackage.id,
            name: seededPackage.name,
        });
    }

    const clients = await prisma.client.findMany({
        select: { id: true, name: true },
    });

    const protectedActions = [
        {
            name: "LOGIN",
            description: "Sign-in and account access protection.",
            riskLevel: "MEDIUM",
        },
        {
            name: "OTP_REQUEST",
            description: "One-time passcode request protection.",
            riskLevel: "HIGH",
        },
    ];

    for (const client of clients) {
        for (const actionData of protectedActions) {
            const existingAction = await prisma.protectedAction.findFirst({
                where: {
                    clientId: client.id,
                    name: actionData.name,
                },
            });

            const action = existingAction
                ? await prisma.protectedAction.update({
                    where: { id: existingAction.id },
                    data: {
                        description: actionData.description,
                        riskLevel: actionData.riskLevel,
                        isActive: true,
                    },
                })
                : await prisma.protectedAction.create({
                    data: {
                        clientId: client.id,
                        ...actionData,
                    },
                });

            console.log("Protected action ready:", {
                client: client.name,
                id: action.id,
                name: action.name,
            });
        }
    }
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });