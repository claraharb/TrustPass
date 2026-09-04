import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { Topbar } from '../components/layout/Topbar';
import '../styles/admin-layout.css';

interface AdminLayoutProps {
  breadcrumbPage?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ breadcrumbPage = 'Dashboard' }) => {
  return (
    <div className="admin-app">
      <AdminSidebar />
      <div className="admin-main">
        <Topbar breadcrumbSection="TrustPass" breadcrumbPage={breadcrumbPage} />
        <main id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
