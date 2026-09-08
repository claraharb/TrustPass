import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AdminUser } from '../types/admin';
import { getStoredAdmin, getStoredClient, logoutAdmin, logoutClient } from '../services/api';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(() => getStoredAdmin());
  const [client, setClient] = useState(() => getStoredClient());

  useEffect(() => {
    const syncSession = () => {
      setAdmin(getStoredAdmin());
      setClient(getStoredClient());
    };
    const handleUnauthorized = () => {
      if (window.location.pathname.startsWith('/client')) {
        logoutClient();
      } else {
        logoutAdmin();
      }
      syncSession();
    };

    window.addEventListener('storage', syncSession);
    window.addEventListener('trustpass:session-changed', syncSession);
    window.addEventListener('trustpass:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('trustpass:session-changed', syncSession);
      window.removeEventListener('trustpass:unauthorized', handleUnauthorized);
    };
  }, []);

  const signOut = () => {
    logoutAdmin();
    setAdmin(null);
  };

  const signOutClient = () => {
    logoutClient();
    setClient(null);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        client,
        isAuthenticated: admin !== null,
        isClientAuthenticated: client !== null,
        signOut,
        signOutClient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
