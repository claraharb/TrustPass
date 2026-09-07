import { createContext } from "react";
import type { AdminUser } from "../types/admin";

export interface AuthContextValue {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
