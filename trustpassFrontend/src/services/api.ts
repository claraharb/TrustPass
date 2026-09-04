import type { AdminDashboardMetrics, AdminUser } from "../types/admin";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => localStorage.getItem("trustpass_admin_token");

async function request<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
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
  localStorage.setItem("trustpass_admin_token", response.token);
  return response.admin;
}

export function logoutAdmin() {
  localStorage.removeItem("trustpass_admin_token");
}

export function getAdminDashboard(range: "7d" | "30d" | "90d") {
  return request<AdminDashboardMetrics>(`/admin/dashboard?range=${range}`);
}
