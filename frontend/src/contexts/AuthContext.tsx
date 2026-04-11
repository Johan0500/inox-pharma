import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "../types";
import api      from "../services/api";
import { setupAutoSync } from "../services/offlineSync";

interface AuthContextType {
  user:            User | null;
  token:           string | null;
  login:           (token: string, user: User) => void;
  logout:          () => void;
  updateUser:      (updates: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,  setUser]  = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser  = localStorage.getItem("user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const code = error.response?.data?.code;
        if (error.response?.status === 401 && code === "SESSION_INVALID") {
          doLogout();
          alert("⚠️ Vous avez été déconnecté par un administrateur.");
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    if (!token) return;
    const cleanup = setupAutoSync((result) => {
      if (result.synced > 0) console.log(`✅ ${result.synced} rapport(s) synchronisé(s)`);
    });
    return cleanup;
  }, [token]);

  const doLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedLab");
    setToken(null);
    setUser(null);
  };

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user",  JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  // ── Met à jour le user localement + localStorage ──────────
  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = async () => {
    try { if (token) await api.post("/auth/logout"); } catch {}
    doLogout();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
};