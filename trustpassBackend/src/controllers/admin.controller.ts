import { Request, Response } from "express";
import prisma from "../config/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";


export async function getClients(req: Request, res: Response) {
    try {
        const clients = await prisma.client.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return res.status(200).json({
            clients,
        });
    } catch (error) {
        console.error("Failed to retrieve clients:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

const createClientSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function createClient(req: Request, res: Response) {
    try {
        const validation = createClientSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validation.error.issues,
            });
        }

        const { name, email, password } = validation.data;

        const existingClient = await prisma.client.findUnique({
            where: { email },
        });

        if (existingClient) {
            return res.status(409).json({
                message: "A client with this email already exists",
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const client = await prisma.client.create({
            data: {
                name,
                email,
                passwordHash,
            },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return res.status(201).json({
            message: "Client created successfully",
            client,
        });
    } catch (error) {
        console.error("Failed to create client:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
const updateClientSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    email: z.string().email("Invalid email address").optional(),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export async function updateClient(req: Request, res: Response) {
    try {
        const clientId = Number(req.params.id);

        if (!Number.isInteger(clientId)) {
            return res.status(400).json({
                message: "Invalid client ID",
            });
        }

        const validation = updateClientSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validation.error.issues,
            });
        }

        const { name, email, password } = validation.data;

        const existingClient = await prisma.client.findUnique({
            where: { id: clientId },
        });

        if (!existingClient) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        if (email && email !== existingClient.email) {
            const emailAlreadyUsed = await prisma.client.findUnique({
                where: { email },
            });

            if (emailAlreadyUsed) {
                return res.status(409).json({
                    message: "A client with this email already exists",
                });
            }
        }

        const updateData: {
            name?: string;
            email?: string;
            passwordHash?: string;
        } = {};

        if (name !== undefined) {
            updateData.name = name;
        }

        if (email !== undefined) {
            updateData.email = email;
        }

        if (password !== undefined) {
            updateData.passwordHash = await bcrypt.hash(password, 12);
        }

        const client = await prisma.client.update({
            where: { id: clientId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return res.status(200).json({
            message: "Client updated successfully",
            client,
        });
    } catch (error) {
        console.error("Failed to update client:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
export async function activateClient(req: Request, res: Response) {
    try {
        const clientId = Number(req.params.id);

        if (!Number.isInteger(clientId)) {
            return res.status(400).json({
                message: "Invalid client ID",
            });
        }

        const existingClient = await prisma.client.findUnique({
            where: { id: clientId },
        });

        if (!existingClient) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        const client = await prisma.client.update({
            where: { id: clientId },
            data: {
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return res.status(200).json({
            message: "Client activated successfully",
            client,
        });
    } catch (error) {
        console.error("Failed to activate client:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
export async function deactivateClient(req: Request, res: Response) {
    try {
        const clientId = Number(req.params.id);

        if (!Number.isInteger(clientId)) {
            return res.status(400).json({
                message: "Invalid client ID",
            });
        }

        const existingClient = await prisma.client.findUnique({
            where: { id: clientId },
        });

        if (!existingClient) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        const client = await prisma.client.update({
            where: { id: clientId },
            data: {
                isActive: false,
            },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return res.status(200).json({
            message: "Client deactivated successfully",
            client,
        });
    } catch (error) {
        console.error("Failed to deactivate client:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function getClientDetails(req: Request, res: Response) {
    try {
        const clientId = Number(req.params.id);

        if (!Number.isInteger(clientId)) {
            return res.status(400).json({
                message: "Invalid client ID",
            });
        }

        const client = await prisma.client.findUnique({
            where: {
                id: clientId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,

                subscriptions: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    select: {
                        id: true,
                        startDate: true,
                        endDate: true,
                        requestsUsed: true,
                        isActive: true,
                        paymentStatus: true,
                        package: {
                            select: {
                                id: true,
                                name: true,
                                requestLimit: true,
                                price: true,
                                durationDays: true,
                                features: true,
                            },
                        },
                    },
                },

                apiUsage: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 20,
                    select: {
                        id: true,
                        endpoint: true,
                        method: true,
                        statusCode: true,
                        requestId: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!client) {
            return res.status(404).json({
                message: "Client not found",
            });
        }

        return res.status(200).json({
            client,
        });
    } catch (error) {
        console.error("Failed to retrieve client details:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

const createPackageSchema = z.object({
    name: z.string().min(2, "Package name must be at least 2 characters"),
    description: z.string().optional(),
    requestLimit: z.number().int().positive("Request limit must be greater than 0"),
    price: z.number().nonnegative("Price cannot be negative"),
    durationDays: z.number().int().positive("Duration must be greater than 0"),
    features: z.string().min(1, "At least one API/feature must be specified"),
});

export async function createPackage(req: Request, res: Response) {
    try {
        const validation = createPackageSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validation.error.issues,
            });
        }

        const {
            name,
            description,
            requestLimit,
            price,
            durationDays,
            features,
        } = validation.data;

        const existingPackage = await prisma.package.findUnique({
            where: { name },
        });

        if (existingPackage) {
            return res.status(409).json({
                message: "A package with this name already exists",
            });
        }

        const packageData = await prisma.package.create({
            data: {
                name,
                description,
                requestLimit,
                price,
                durationDays,
                features,
            },
            select: {
                id: true,
                name: true,
                description: true,
                requestLimit: true,
                price: true,
                durationDays: true,
                features: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return res.status(201).json({
            message: "Package created successfully",
            package: packageData,
        });
    } catch (error) {
        console.error("Failed to create package:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
const updatePackageSchema = z.object({
    name: z.string().min(2, "Package name must be at least 2 characters").optional(),
    description: z.string().optional(),
    requestLimit: z.number().int().positive("Request limit must be greater than 0").optional(),
    price: z.number().nonnegative("Price cannot be negative").optional(),
    durationDays: z.number().int().positive("Duration must be greater than 0").optional(),
    features: z.string().min(1, "At least one API/feature must be specified").optional(),
});

export async function updatePackage(req: Request, res: Response) {
    try {
        const packageId = Number(req.params.id);

        if (!Number.isInteger(packageId)) {
            return res.status(400).json({
                message: "Invalid package ID",
            });
        }

        const validation = updatePackageSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validation.error.issues,
            });
        }

        const existingPackage = await prisma.package.findUnique({
            where: { id: packageId },
        });

        if (!existingPackage) {
            return res.status(404).json({
                message: "Package not found",
            });
        }

        const { name } = validation.data;

        if (name && name !== existingPackage.name) {
            const duplicatePackage = await prisma.package.findUnique({
                where: { name },
            });

            if (duplicatePackage) {
                return res.status(409).json({
                    message: "A package with this name already exists",
                });
            }
        }

        const packageData = await prisma.package.update({
            where: { id: packageId },
            data: validation.data,
            select: {
                id: true,
                name: true,
                description: true,
                requestLimit: true,
                price: true,
                durationDays: true,
                features: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return res.status(200).json({
            message: "Package updated successfully",
            package: packageData,
        });
    } catch (error) {
        console.error("Failed to update package:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function deactivatePackage(req: Request, res: Response) {
    try {
        const packageId = Number(req.params.id);

        if (!Number.isInteger(packageId)) {
            return res.status(400).json({
                message: "Invalid package ID",
            });
        }

        const existingPackage = await prisma.package.findUnique({
            where: { id: packageId },
        });

        if (!existingPackage) {
            return res.status(404).json({
                message: "Package not found",
            });
        }

        const packageData = await prisma.package.update({
            where: { id: packageId },
            data: {
                isActive: false,
            },
            select: {
                id: true,
                name: true,
                description: true,
                requestLimit: true,
                price: true,
                durationDays: true,
                features: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return res.status(200).json({
            message: "Package deactivated successfully",
            package: packageData,
        });
    } catch (error) {
        console.error("Failed to deactivate package:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}