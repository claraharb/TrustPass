import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Repeat,
  Radio,
  BarChart3,
  ShieldAlert,
  Sparkles,
  ArrowLeftRight,
  FileText,
  LogOut,
} from 'lucide-react';
import trustpassLogo from '../../assets/brand/trustpass-logo.svg';
import { useAuth } from '../../auth/useAuth';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: {
    text: string;
    variant: 'danger' | 'teal' | 'neutral' | 'live';
  };
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      {
        name: 'Transactions',
        path: '/admin/transactions',
        icon: ArrowLeftRight,
        badge: { text: 'Live', variant: 'live' },
      },
      { name: 'API usage', path: '/admin/api-usage', icon: BarChart3 },
    ],
  },
  {
    title: 'Trust & network',
    items: [
      {
        name: 'Fraud monitoring',
        path: '/admin/fraud',
        icon: ShieldAlert,
        badge: { text: '12', variant: 'danger' },
      },
      { name: 'AI policies', path: '/admin/ai-policies', icon: Sparkles },
      {
        name: 'Network APIs',
        path: '/admin/apis',
        icon: Radio,
        badge: { text: 'CAMARA', variant: 'teal' },
      },
    ],
  },
  {
    title: 'Management',
    items: [
      { name: 'Clients', path: '/admin/clients', icon: Users },
      { name: 'Packages', path: '/admin/packages', icon: Package },
      { name: 'Subscriptions', path: '/admin/subscriptions', icon: Repeat },
      { name: 'Reports', path: '/admin/reports', icon: FileText },
    ],
  },
];

export const AdminSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, signOut } = useAuth();

  const isItemActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="admin-sidebar" aria-label="Admin Navigation">
      <div className="sidebar-brand">
        <Link to="/admin" title="TrustPass Admin Portal" className="brand-link">
          <img src={trustpassLogo} alt="TrustPass" className="sidebar-logo" />
        </Link>
        <div className="admin-console-badge">
          <span>Admin console</span>
          <span className="live-dot-mini" title="Connected to CAMARA Gateway" />
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-nav-title">{section.title}</div>
            <div className="sidebar-section-items">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`sidebar-nav-item ${active ? 'active' : ''}`}
                    title={item.name}
                  >
                    <span className="sidebar-nav-icon">
                      <Icon size={16} />
                    </span>
                    <span className="nav-label">{item.name}</span>

                    {item.badge && (
                      <span className={`nav-badge ${item.badge.variant}`}>
                        {item.badge.variant === 'live' && (
                          <span className="live-pulse-dot" />
                        )}
                        {item.badge.text}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="admin-profile-card">
          <div className="avatar-wrapper">
            <div className="admin-avatar">{admin?.name.charAt(0).toUpperCase() ?? 'A'}</div>
            <span className="online-indicator" title="Admin Session Active" />
          </div>
          <div className="admin-user-info">
            <div className="admin-name-row">
              <b>{admin?.name ?? 'TrustPass admin'}</b>
            </div>
            <span className="admin-role-pill">{admin?.role === 'ADMIN' ? 'Admin' : 'Unknown role'}</span>
          </div>
          <button
            type="button"
            className="sidebar-logout-btn"
            title="Log Out"
            aria-label="Log Out"
            onClick={() => {
              signOut();
              navigate('/admin/login');
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
