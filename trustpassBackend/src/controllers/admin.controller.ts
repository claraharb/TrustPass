import { Request, Response } from "express";
import prisma from "../config/prisma";
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
  requestLimit: z
    .number()
    .int()
    .positive("Request limit must be greater than 0"),
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

    const { name, description, requestLimit, price, durationDays, features } =
      validation.data;

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
  name: z
    .string()
    .min(2, "Package name must be at least 2 characters")
    .optional(),
  description: z.string().optional(),
  requestLimit: z
    .number()
    .int()
    .positive("Request limit must be greater than 0")
    .optional(),
  price: z.number().nonnegative("Price cannot be negative").optional(),
  durationDays: z
    .number()
    .int()
    .positive("Duration must be greater than 0")
    .optional(),
  features: z
    .string()
    .min(1, "At least one API/feature must be specified")
    .optional(),
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

const RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
} as const;

type Range = keyof typeof RANGE_DAYS;

type DashboardRequest = {
  createdAt: Date;
  trustDecision: { decision: string } | null;
  riskSignals: Array<{ source: string }>;
};

type DashboardApiUsage = { statusCode: number };

type DashboardFraudEvent = {
  id: number;
  clientId: number;
  trustRequestId: number | null;
  eventType: string;
  severity: string;
  description: string | null;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  client: { name: string };
};

function getRange(value: unknown): Range {
  return value === "7d" || value === "90d" ? value : "30d";
}

function getSince(days: number, end = new Date()) {
  const since = new Date(end);
  since.setDate(since.getDate() - days);
  return since;
}

function formatLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatRelativeTime(date: Date) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function serializeTransaction(request: {
  id: number;
  clientId: number;
  protectedActionId: number;
  requestId: string;
  phoneNumber: string | null;
  ipAddress: string | null;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  client: { name: string };
  protectedAction: { name: string };
  riskSignals: Array<{
    id: number;
    trustRequestId: number;
    signalType: string;
    source: string;
    value: string | null;
    riskScore: number | null;
    isPositive: boolean | null;
    details: string | null;
    createdAt: Date;
  }>;
  trustDecision: {
    decision: string;
    trustScore: number;
    riskLevel: string;
  } | null;
}) {
  return {
    id: request.id,
    clientId: request.clientId,
    clientName: request.client.name,
    protectedActionId: request.protectedActionId,
    protectedActionName: request.protectedAction.name,
    requestId: request.requestId,
    phoneNumber: request.phoneNumber,
    ipAddress: request.ipAddress,
    status: request.status,
    createdAt: formatRelativeTime(request.createdAt),
    completedAt: request.completedAt?.toISOString(),
    decision: request.trustDecision?.decision,
    trustScore: request.trustDecision?.trustScore,
    riskLevel: request.trustDecision?.riskLevel,
    riskSignals: request.riskSignals.map((signal) => ({
      ...signal,
      createdAt: formatRelativeTime(signal.createdAt),
    })),
  };
}

export async function getDashboard(req: Request, res: Response) {
  try {
    const range = getRange(req.query.range);
    const days = RANGE_DAYS[range];
    const now = new Date();
    const since = getSince(days, now);
    const previousSince = getSince(days * 2, now);

    const [
      activeClients,
      previousClients,
      trustRequests,
      previousTrustRequests,
      openFraudEvents,
      highSeverityFraudEvents,
      apiUsage,
      previousApiUsage,
      recentRequests,
      recentFraudEvents,
    ] = await Promise.all([
      prisma.client.count({ where: { isActive: true } }),
      prisma.client.count({
        where: { isActive: true, createdAt: { lt: since } },
      }),
      prisma.trustRequest.findMany({
        where: { createdAt: { gte: since } },
        include: {
          trustDecision: true,
          riskSignals: {
            select: {
              source: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.trustRequest.count({
        where: { createdAt: { gte: previousSince, lt: since } },
      }),
      prisma.fraudEvent.count({
        where: { status: { in: ["OPEN", "INVESTIGATING"] } },
      }),
      prisma.fraudEvent.count({
        where: {
          status: { in: ["OPEN", "INVESTIGATING"] },
          severity: { in: ["HIGH", "CRITICAL"] },
        },
      }),
      prisma.apiUsage.findMany({
        where: { createdAt: { gte: since } },
        select: { statusCode: true, createdAt: true },
      }),
      prisma.apiUsage.count({
        where: { createdAt: { gte: previousSince, lt: since } },
      }),
      prisma.trustRequest.findMany({
        where: { createdAt: { gte: since } },
        include: {
          client: { select: { name: true } },
          protectedAction: { select: { name: true } },
          riskSignals: true,
          trustDecision: {
            select: { decision: true, trustScore: true, riskLevel: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.fraudEvent.findMany({
        where: { status: { in: ["OPEN", "INVESTIGATING"] } },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

    const dashboardRequests = trustRequests as DashboardRequest[];
    const dashboardApiUsage = apiUsage as DashboardApiUsage[];
    const dashboardFraudEvents = recentFraudEvents as DashboardFraudEvent[];

    const decisionCounts = new Map<string, number>();
    const activityByDay = new Map<
      string,
      { requests: number; allowed: number; blocked: number }
    >();
    for (const request of dashboardRequests) {
      const decision = request.trustDecision?.decision;
      if (decision)
        decisionCounts.set(decision, (decisionCounts.get(decision) ?? 0) + 1);
      const day = request.createdAt.toISOString().slice(0, 10);
      const activity = activityByDay.get(day) ?? {
        requests: 0,
        allowed: 0,
        blocked: 0,
      };
      activity.requests += 1;
      if (decision === "ALLOW") activity.allowed += 1;
      if (decision === "BLOCK") activity.blocked += 1;
      activityByDay.set(day, activity);
    }

    const decisionOrder = ["ALLOW", "CHALLENGE", "THROTTLE", "BLOCK"];
    const assessed = dashboardRequests.filter(
      (request) => request.trustDecision,
    ).length;
    const decisionDistribution = decisionOrder.map((decision) => {
      const count = decisionCounts.get(decision) ?? 0;
      return {
        decision,
        label: decision,
        count,
        percentage: assessed === 0 ? 0 : Math.round((count / assessed) * 100),
        color: `var(--${decision === "ALLOW" ? "teal" : decision === "BLOCK" ? "red" : decision === "CHALLENGE" ? "amber" : "slate"})`,
      };
    });

    const activityTrend = Array.from(activityByDay.entries()).map(
      ([date, activity]) => ({
        date,
        label: formatLabel(new Date(`${date}T00:00:00`)),
        ...activity,
      }),
    );
    const successfulApiRequests = dashboardApiUsage.filter(
      (request) => request.statusCode >= 200 && request.statusCode < 300,
    ).length;
    const apiTotal = dashboardApiUsage.length;

    return res.json({
      timeRange: range,
      activeClients: {
        total: activeClients,
        deltaPercentage: percentageChange(activeClients, previousClients),
        isPositive: activeClients >= previousClients,
      },
      trustRequests: {
        total: trustRequests.length,
        deltaPercentage: percentageChange(
          trustRequests.length,
          previousTrustRequests,
        ),
        isPositive: trustRequests.length >= previousTrustRequests,
      },
      openFraudEvents: {
        total: openFraudEvents,
        highSeverityCount: highSeverityFraudEvents,
      },
      apiRequestsUsed: {
        formatted:
          apiTotal >= 1000
            ? `${(apiTotal / 1000).toFixed(1)}K`
            : apiTotal.toString(),
        total: apiTotal,
        successRatePercentage:
          apiTotal === 0
            ? 0
            : Number(((successfulApiRequests / apiTotal) * 100).toFixed(1)),
      },
      decisionDistribution,
      activityTrend,
      recentTransactions: recentRequests.map(serializeTransaction),
      recentFraudEvents: dashboardFraudEvents.map((event) => ({
        ...event,
        clientName: event.client.name,
        createdAt: formatRelativeTime(event.createdAt),
        resolvedAt: event.resolvedAt?.toISOString(),
      })),
      networkApiStatus: {
        isOperational: true,
        provider: "CAMARA / Open Gateway + Nokia NaC",
        camaraSignalsActive: dashboardRequests.reduce(
          (count, request) =>
            count +
            request.riskSignals.filter((signal) => signal.source === "CAMARA")
              .length,
          0,
        ),
        latencyMs: 0,
      },
    });
  } catch (error) {
    console.error("Dashboard data fetch failed:", error);
    return res.status(500).json({ message: "Failed to load dashboard data" });
  }
}
