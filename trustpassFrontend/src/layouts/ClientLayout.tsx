import { KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
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
        <a className="client-brand" href="/client">
          <span className="client-brand-mark"><ShieldCheck size={18} /></span>
          <span>TrustPass</span>
        </a>
        <div className="client-header-account">
          <a className="client-header-link" href="/client/api-keys"><KeyRound size={15} /> API keys</a>
          <a className="client-header-link" href="/client/account">Account</a>
          <div>
            <strong>{client?.name}</strong>
            <span>{client?.email}</span>
          </div>
          <button type="button" className="client-signout" onClick={handleSignOut} aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main className="client-main"><Outlet /></main>
    </div>
  );
}
