import type {
  AdminDashboardMetrics,
  AdminUser,
  ClientUser,
} from "../types/admin";
import type { Client, ClientDetails } from "../types/client";

const API_URL = import.meta.env.VITE_API_URL;
const ADMIN_TOKEN_KEY = "trustpass_admin_token";
const ADMIN_SESSION_KEY = "trustpass_admin_session";
const CLIENT_TOKEN_KEY = "trustpass_client_token";
const CLIENT_SESSION_KEY = "trustpass_client_session";

const getToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);

const getClientToken = () => localStorage.getItem(CLIENT_TOKEN_KEY);

export function getStoredAdmin(): AdminUser | null {
  const serializedAdmin = localStorage.getItem(ADMIN_SESSION_KEY);

  if (!serializedAdmin) return null;

  try {
    return JSON.parse(serializedAdmin) as AdminUser;
  } catch {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const isClientAuthRequest = path.startsWith("/auth/client");
  const isClientRequest = path.startsWith("/client/");
  const token = isClientAuthRequest
    ? null
    : isClientRequest
      ? getClientToken()
      : getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401 && token) {
      if (isClientRequest) {
        localStorage.removeItem(CLIENT_TOKEN_KEY);
        localStorage.removeItem(CLIENT_SESSION_KEY);
      } else {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
      window.dispatchEvent(new Event("trustpass:unauthorized"));
    }

    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message || `Request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function getHealth() {
  return request<{
    status: string;
    service: string;
    database: string;
    message: string;
  }>("/health");
}

export async function loginAdmin(email: string, password: string) {
  const response = await request<{ token: string; admin: AdminUser }>(
    "/auth/admin/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  const admin = { ...response.admin, role: "ADMIN" as const };
  localStorage.setItem(ADMIN_TOKEN_KEY, response.token);
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(admin));
  window.dispatchEvent(new Event("trustpass:session-changed"));
  return admin;
}

export function logoutAdmin() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
  window.dispatchEvent(new Event("trustpass:session-changed"));
}

export function getStoredClient(): ClientUser | null {
  const serializedClient = localStorage.getItem(CLIENT_SESSION_KEY);

  if (!serializedClient) return null;

  try {
    return JSON.parse(serializedClient) as ClientUser;
  } catch {
    localStorage.removeItem(CLIENT_SESSION_KEY);
    return null;
  }
}

export async function loginClient(email: string, password: string) {
  const response = await request<{
    token: string;
    client: Omit<ClientUser, "role">;
  }>("/auth/client/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const client = { ...response.client, role: "CLIENT" as const };
  localStorage.setItem(CLIENT_TOKEN_KEY, response.token);
  localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(client));
  window.dispatchEvent(new Event("trustpass:session-changed"));
  return client;
}

export async function registerClient(
  name: string,
  email: string,
  password: string,
) {
  const response = await request<{
    token: string;
    client: Omit<ClientUser, "role">;
  }>("/auth/client/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  const client = { ...response.client, role: "CLIENT" as const };
  localStorage.setItem(CLIENT_TOKEN_KEY, response.token);
  localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(client));
  window.dispatchEvent(new Event("trustpass:session-changed"));
  return client;
}

export async function logoutClient() {
  try {
    const token = getClientToken();
    if (token) {
      await request("/auth/client/logout", { method: "POST" });
    }
  } catch (error) {
    console.error("Server logout failed, clearing local session anyway", error);
  } finally {
    localStorage.removeItem(CLIENT_TOKEN_KEY);
    localStorage.removeItem(CLIENT_SESSION_KEY);
    window.dispatchEvent(new Event("trustpass:session-changed"));
  }
}

export function getAdminDashboard(range: "7d" | "30d" | "90d") {
  return request<AdminDashboardMetrics>(`/admin/dashboard?range=${range}`);
}

export function getAdminClients() {
  return request<{ clients: Client[] }>("/admin/clients");
}

export function getAdminClientDetails(clientId: number) {
  return request<{ client: ClientDetails }>(`/admin/clients/${clientId}`);
}

export function updateClientAccount(input: {
  name?: string;
  email?: string;
  password?: string;
}) {
  return request<{ message: string; client: Client }>("/client/account", {
    method: "PUT",
    body: JSON.stringify(input),
  }).then((response) => {
    const client = {
      id: response.client.id,
      name: response.client.name,
      email: response.client.email,
      role: "CLIENT" as const,
    };
    localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(client));
    window.dispatchEvent(new Event("trustpass:session-changed"));
    return response;
  });
}

export function deleteClientAccount() {
  return request<{ message: string }>("/client/account", {
    method: "DELETE",
  });
}

export interface ClientPackage {
  id: number;
  name: string;
  description: string | null;
  requestLimit: number;
  price: string | number;
  durationDays: number;
  features: string;
  isActive?: boolean;
}

export interface ClientSubscription {
  id: number;
  startDate: string;
  endDate: string;
  requestsUsed: number;
  isActive: boolean;
  paymentStatus: string;
  package: ClientPackage;
}

export interface ClientUsage {
  subscriptionId: number;
  packageName: string;
  requestLimit: number;
  requestsUsed: number;
  remainingRequests: number;
  usagePercentage: number;
  startDate: string;
  endDate: string;
}

export interface ClientApiKey {
  id: number;
  keyPrefix: string;
  status: "ACTIVE" | "REVOKED";
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  usageCount?: number;
}

export interface NewlyCreatedClientApiKey extends ClientApiKey {
  key: string;
}

export function getClientPackages() {
  return request<{ packages: ClientPackage[] }>("/packages");
}

export function createAdminPackage(input: {
  name: string;
  description?: string;
  requestLimit: number;
  price: number;
  durationDays: number;
  features: string;
}) {
  return request<{ message: string; package: ClientPackage }>("/admin/packages", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminPackage(packageId: number, input: Partial<{
  name: string;
  description: string;
  requestLimit: number;
  price: number;
  durationDays: number;
  features: string;
}>) {
  return request<{ message: string; package: ClientPackage }>(`/admin/packages/${packageId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deactivateAdminPackage(packageId: number) {
  return request<{ message: string; package: ClientPackage }>(`/admin/packages/${packageId}/deactivate`, {
    method: "PATCH",
  });
}

export function getCurrentClientSubscription() {
  return request<{
    subscription: ClientSubscription;
    remainingRequests: number;
  }>("/client/subscriptions/current");
}

export function createClientSubscription(packageId: number) {
  return request<{ message: string; subscription: ClientSubscription }>(
    "/client/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({ packageId }),
    },
  );
}

export function getClientUsage() {
  return request<{ usage: ClientUsage }>("/client/subscriptions/usage");
}

export function getClientApiKeys() {
  return request<{ apiKeys: ClientApiKey[] }>("/client/api-keys");
}

export function createClientApiKey() {
  return request<{ message: string; apiKey: NewlyCreatedClientApiKey }>(
    "/client/api-keys",
    { method: "POST" },
  );
}

export function revokeClientApiKey(apiKeyId: number) {
  return request<{ message: string; apiKey: ClientApiKey }>(
    `/client/api-keys/${apiKeyId}/revoke`,
    { method: "PATCH" },
  );
}

export function rotateClientApiKey(apiKeyId: number) {
  return request<{
    message: string;
    oldApiKeyId: number;
    apiKey: NewlyCreatedClientApiKey;
  }>(`/client/api-keys/${apiKeyId}/rotate`, { method: "POST" });
}

export function testApiKeyValidation(apiKey: string) {
  return request<{
    message: string;
    apiKey: { id: number; keyPrefix: string; status: string };
    client: { id: number };
  }>(
    "/client/api-keys/test-validation",
    { headers: { "x-api-key": apiKey } }
  );
}

export function testApiKeyUsage(apiKey: string) {
  return request<{ message: string; usage: unknown }>(
    "/client/api-keys/test-usage",
    { headers: { "x-api-key": apiKey } }
  );
}

  export interface TrustCheckSignal {
    signalType: string;
    source: string;
    value?: string;
    riskScore?: number;
    isPositive?: boolean;
    details?: string;
  }

  export interface TrustCheckResult {
    requestId: string;
    status: "COMPLETED" | "PENDING";
    pendingAction?: string;
    authorizationUrl?: string;
    assessment?: {
      actionRiskLevel: string;
      evidenceRequirements: string[];
    };
    aiAgent?: {
      riskAssessment: string;
      selectedSignals: string[];
      additionalEvidenceNeeded: boolean;
      reason: string;
    };
    signals?: TrustCheckSignal[];
    decision?: {
      trustScore: number;
      riskLevel: string;
      decision: "ALLOW" | "CHALLENGE" | "THROTTLE" | "BLOCK";
      explanation?: string;
    };
    message: string;
  }

  export function postTrustCheck(
    apiKey: string,
    input: {
      action: string;
      phoneNumber?: string;
      ipAddress?: string;
      userAgent?: string;
      attemptCount?: number;
    },
  ) {
    return request<TrustCheckResult>("/trust/check", {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: JSON.stringify(input),
    });
  }

  export function getNumberVerificationCallback(code: string, state: string) {
    return request<TrustCheckResult>(`/camara/number-verification/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
  }

