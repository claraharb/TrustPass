import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function RequireAdminSession() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function RedirectAuthenticatedAdmin() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <Navigate to="/admin" replace /> : <Outlet />;
}
