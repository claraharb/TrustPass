import type { TrustRequest, TrustDecisionType } from "./trust";
import type { FraudEvent } from "./fraud";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "ADMIN";
}

export interface ClientUser {
  id: number;
  name: string;
  email: string;
  role: "CLIENT";
}

export interface DecisionStat {
  decision: TrustDecisionType;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TrustActivityPoint {
  date: string;
  label: string;
  requests: number;
  blocked: number;
  allowed: number;
}

export interface AdminDashboardMetrics {
  timeRange: "7d" | "30d" | "90d";
  activeClients: {
    total: number;
    deltaPercentage: number;
    isPositive: boolean;
  };
  trustRequests: {
    total: number;
    deltaPercentage: number;
    isPositive: boolean;
  };
  openFraudEvents: {
    total: number;
    highSeverityCount: number;
  };
  apiRequestsUsed: {
    formatted: string;
    total: number;
    successRatePercentage: number;
  };
  decisionDistribution: DecisionStat[];
  activityTrend: TrustActivityPoint[];
  recentTransactions: TrustRequest[];
  recentFraudEvents: FraudEvent[];
  networkApiStatus: {
    isOperational: boolean;
    provider: string;
    camaraSignalsActive: number;
    latencyMs: number;
  };
}
