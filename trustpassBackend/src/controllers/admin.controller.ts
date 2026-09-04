import { Request, Response } from "express";
import prisma from "../config/prisma";

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
        include: { trustDecision: true },
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
