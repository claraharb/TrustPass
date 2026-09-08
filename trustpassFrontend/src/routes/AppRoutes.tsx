import { Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { AdminLogin } from "../pages/admin/AdminLogin";
import { BlankPage } from "../pages/admin/BlankPage";
import { AdminClients } from "../pages/admin/AdminClients";
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
          <Route path="packages" element={<BlankPage />} />
          <Route path="subscriptions" element={<BlankPage />} />
          <Route path="apis" element={<BlankPage />} />
          <Route path="api-usage" element={<BlankPage />} />
          <Route path="fraud" element={<BlankPage />} />
          <Route path="ai-policies" element={<BlankPage />} />
          <Route path="transactions" element={<BlankPage />} />
          <Route path="reports" element={<BlankPage />} />
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
          <Route path="account" element={<ClientAccount />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}