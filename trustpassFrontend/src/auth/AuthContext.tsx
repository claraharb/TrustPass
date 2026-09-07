import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AdminUser } from '../types/admin';
import { getStoredAdmin, logoutAdmin } from '../services/api';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(() => getStoredAdmin());

  useEffect(() => {
    const syncSession = () => setAdmin(getStoredAdmin());
    const handleUnauthorized = () => {
      logoutAdmin();
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

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated: admin !== null, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
