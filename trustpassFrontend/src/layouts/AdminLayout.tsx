import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { Topbar } from '../components/layout/Topbar';
import '../styles/admin-layout.css';

interface AdminLayoutProps {
  breadcrumbPage?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ breadcrumbPage }) => {
  const location = useLocation();
  
  const getBreadcrumb = () => {
    if (breadcrumbPage) return breadcrumbPage;
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length <= 1) return 'Dashboard';
    
    const lastPart = parts[1];
    const customMap: Record<string, string> = {
      'api-usage': 'API usage',
      'ai-policies': 'AI policies',
      'apis': 'Network APIs',
    };
    if (customMap[lastPart]) return customMap[lastPart];
    
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ');
  };

  return (
    <div className="admin-app">
      <AdminSidebar />
      <div className="admin-main">
        <Topbar breadcrumbSection="TrustPass" breadcrumbPage={getBreadcrumb()} />
        <main id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
