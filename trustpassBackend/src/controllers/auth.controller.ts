import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../config/prisma";
import jwt from "jsonwebtoken";
import { revokeToken } from "../services/token.service";

const loginClientSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerClientSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerClient(req: Request, res: Response) {
  try {
    const validation = registerClientSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.issues,
      });
    }

    const { name, email, password } = validation.data;
    const existingClient = await prisma.client.findUnique({ where: { email } });

    if (existingClient) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const client = await prisma.client.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });

    const token = jwt.sign(
      { clientId: client.id, role: "CLIENT" },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" },
    );

    return res.status(201).json({
      message: "Client account created successfully",
      token,
      client,
    });
  } catch (error) {
    console.error("Client registration failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function loginClient(req: Request, res: Response) {
  try {
    const validation = loginClientSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.issues,
      });
    }

    const { email, password } = validation.data;

    const client = await prisma.client.findUnique({
      where: { email },
    });

    if (!client) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!client.isActive) {
      return res.status(403).json({
        message: "Client account is inactive",
      });
    }

    const passwordMatches = await bcrypt.compare(password, client.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        clientId: client.id,
        role: "CLIENT",
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "1h",
      },
    );

    return res.status(200).json({
      message: "Client login successful",
      token,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
      },
    });
  } catch (error) {
    console.error("Client login failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function logoutClient(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    revokeToken(token);

    return res.status(200).json({
      message: "Client logout successful",
    });
  } catch (error) {
    console.error("Client logout failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function loginAdmin(req: Request, res: Response) {
  try {
    const validation = loginAdminSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.issues,
      });
    }

    const { email, password } = validation.data;

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        message: "Admin account is inactive",
      });
    }

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        adminId: admin.id,
        role: "ADMIN",
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "1h",
      },
    );

    return res.status(200).json({
      message: "Admin login successful",
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Admin login failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
