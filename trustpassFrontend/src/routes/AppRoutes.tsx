import { Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { AdminLogin } from "../pages/admin/AdminLogin";
import { BlankPage } from "../pages/admin/BlankPage";
import { AdminClients } from "../pages/admin/AdminClients";
import {
  RedirectAuthenticatedAdmin,
  RequireAdminSession,
} from "./AdminRouteGuards";

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

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}