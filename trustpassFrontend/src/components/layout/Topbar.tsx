import React from 'react';
import { Bell, Settings } from 'lucide-react';

interface TopbarProps {
  breadcrumbSection?: string;
  breadcrumbPage?: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  breadcrumbSection = 'TrustPass',
  breadcrumbPage = 'Dashboard',
}) => {
  return (
    <header className="admin-topbar">
      <div className="admin-breadcrumb">
        <span>{breadcrumbSection}</span>
        <span className="sep">/</span>
        <b>{breadcrumbPage}</b>
      </div>

      <div className="admin-topbar-actions">
        <div className="live-beacon-chip" title="Connected to AI Trust Engine & CAMARA Adapter">
          <span className="live-pulse-dot" />
          <span>CAMARA Signals Live</span>
        </div>

        <button
          type="button"
          className="topbar-icon-btn"
          title="Notifications"
          aria-label="View notifications"
        >
          <Bell size={16} />
          <span className="badge-dot" />
        </button>

        <button
          type="button"
          className="topbar-icon-btn"
          title="Platform Settings"
          aria-label="Open settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
