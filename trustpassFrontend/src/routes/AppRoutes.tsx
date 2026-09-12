import { Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { AdminLogin } from "../pages/admin/AdminLogin";
import { UnavailablePage } from "../pages/common/UnavailablePage";
import { AdminClients } from "../pages/admin/AdminClients";
import { AdminPackages } from "../pages/admin/AdminPackages";
import {
  RedirectAuthenticatedAdmin,
  RedirectAuthenticatedClient,
  RequireAdminSession,
  RequireClientSession,
} from "./AdminRouteGuards";
import { ClientLogin } from "../pages/client/ClientLogin";
import { ClientSignup } from "../pages/client/ClientSignup";
import { ClientLayout } from "../layouts/ClientLayout";
import { ClientHome } from "../pages/client/ClientHome";
import { ClientApiKeys } from "../pages/client/ClientApiKeys";
import { ClientAccount } from "../pages/client/ClientAccount";
import { ClientTrustCheck } from "../pages/client/ClientTrustCheck";
import { NumberVerificationCallback } from "../pages/client/NumberVerificationCallback";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route element={<RedirectAuthenticatedAdmin />}>
        <Route path="/admin/login" element={<AdminLogin />} />
      </Route>

      <Route element={<RequireAdminSession />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="packages" element={<AdminPackages />} />
          <Route path="subscriptions" element={<UnavailablePage />} />
          <Route path="apis" element={<UnavailablePage />} />
          <Route path="api-usage" element={<UnavailablePage />} />
          <Route path="fraud" element={<UnavailablePage />} />
          <Route path="ai-policies" element={<UnavailablePage />} />
          <Route path="transactions" element={<UnavailablePage />} />
          <Route path="reports" element={<UnavailablePage />} />
        </Route>
      </Route>

      <Route element={<RedirectAuthenticatedClient />}>
        <Route path="/client/login" element={<ClientLogin />} />
        <Route path="/client/signup" element={<ClientSignup />} />
      </Route>

      <Route element={<RequireClientSession />}>
        <Route path="/client" element={<ClientLayout />}>
          <Route index element={<ClientHome />} />
          <Route path="api-keys" element={<ClientApiKeys />} />
          <Route path="trust-check" element={<ClientTrustCheck />} />
          <Route path="trust-check/callback" element={<NumberVerificationCallback />} />
          <Route path="protected-actions" element={<UnavailablePage />} />
          <Route path="history" element={<UnavailablePage />} />
          <Route path="account" element={<ClientAccount />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}