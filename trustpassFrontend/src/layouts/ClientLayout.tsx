import { Activity, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import trustpassLogo from '../assets/brand/trustpass-logo.svg';
import '../styles/client.css';

export function ClientLayout() {
  const { client, signOutClient } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOutClient();
    navigate('/client/login', { replace: true });
  };

  return (
    <div className="client-app">
      <header className="client-header">
        <div className="client-header-inner">
          <Link className="client-brand" to="/client">
            <img src={trustpassLogo} alt="TrustPass" className="client-brand-logo" />
            <span className="client-brand-context">Client console</span>
          </Link>
          <div className="client-header-account">
            <nav className="client-header-nav" aria-label="Client navigation">
              <Link className="client-header-link" to="/client/trust-check"><ShieldCheck size={15} /> Trust lab</Link>
              <Link className="client-header-link" to="/client/api-keys"><KeyRound size={15} /> API keys</Link>
              <Link className="client-header-link" to="/client"><Activity size={15} /> Usage</Link>
            </nav>
            <Link className="client-header-profile" to="/client/account">
              <span className="client-header-avatar">{client?.name?.charAt(0).toUpperCase() ?? 'C'}</span>
              <span className="client-header-user"><strong>{client?.name}</strong><span>{client?.email}</span></span>
            </Link>
            <button type="button" className="client-signout" onClick={handleSignOut} aria-label="Sign out" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <main className="client-main"><Outlet /></main>
    </div>
  );
}
