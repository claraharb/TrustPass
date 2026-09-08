import { createContext } from "react";
import type { AdminUser, ClientUser } from "../types/admin";

export interface AuthContextValue {
  admin: AdminUser | null;
  client: ClientUser | null;
  isAuthenticated: boolean;
  isClientAuthenticated: boolean;
  signOut: () => void;
  signOutClient: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
