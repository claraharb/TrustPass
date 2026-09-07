import type { AdminDashboardMetrics, AdminUser } from "../types/admin";
import type { Client, ClientDetails } from "../types/client";

const API_URL = import.meta.env.VITE_API_URL;
const ADMIN_TOKEN_KEY = "trustpass_admin_token";
const ADMIN_SESSION_KEY = "trustpass_admin_session";

const getToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);

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

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401 && getToken()) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_SESSION_KEY);
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

export function getAdminDashboard(range: "7d" | "30d" | "90d") {
  return request<AdminDashboardMetrics>(`/admin/dashboard?range=${range}`);
}

export function getAdminClients() {
  return request<{ clients: Client[] }>("/admin/clients");
}

export function getAdminClientDetails(clientId: number) {
  return request<{ client: ClientDetails }>(`/admin/clients/${clientId}`);
}

export function createAdminClient(input: {
  name: string;
  email: string;
  password: string;
}) {
  return request<{ message: string; client: Client }>("/admin/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminClient(
  clientId: number,
  input: { name?: string; email?: string; password?: string },
) {
  return request<{ message: string; client: Client }>(
    `/admin/clients/${clientId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export function setAdminClientStatus(clientId: number, isActive: boolean) {
  return request<{ message: string; client: Client }>(
    `/admin/clients/${clientId}/${isActive ? "activate" : "deactivate"}`,
    { method: "PATCH" },
  );
}
