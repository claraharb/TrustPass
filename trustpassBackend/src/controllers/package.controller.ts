import { Request, Response } from "express";
import prisma from "../config/prisma";

export async function getAvailablePackages(req: Request, res: Response) {
  try {
    const packages = await prisma.package.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        requestLimit: true,
        price: true,
        durationDays: true,
        features: true,
      },
      orderBy: {
        price: "asc",
      },
    });

    return res.status(200).json({
      packages,
    });
  } catch (error) {
    console.error("Failed to retrieve available packages:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
