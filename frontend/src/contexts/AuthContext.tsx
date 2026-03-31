import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { User } from "../types";
import api from "../services/api";
import { setupAutoSync } from "../services/offlineSync";

interface AuthContextType {
  user:            User | null;
  token:           string | null;
  login:           (token: string, user: User) => void;
  logout:          () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,  setUser]  = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const inactivityTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser  = localStorage.getItem("user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      resetInactivityTimer();
    }
  }, []);

  // Intercepter les erreurs 401
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const code = error.response?.data?.code;
        if (error.response?.status === 401) {
          if (code === "SESSION_INVALID" || code === "SESSION_EXPIRED") {
            doLogout();
            alert(error.response.data.error);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  // Réinitialiser le timer sur chaque interaction
  useEffect(() => {
    if (!token) return;
    const events = ["mousedown","keydown","touchstart","scroll","click"];
    const handler = () => resetInactivityTimer();
    events.forEach((e) => window.addEventListener(e, handler));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [token]);

  // Synchronisation automatique des rapports hors-ligne
  useEffect(() => {
    if (!token) return;
    const cleanup = setupAutoSync((result) => {
      if (result.synced > 0) {
        console.log(`✅ ${result.synced} rapport(s) synchronisé(s) automatiquement`);
      }
    });
    return cleanup;
  }, [token]);

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      doLogout();
      alert("Vous avez été déconnecté après 1h d'inactivité.");
    }, 60 * 60 * 1000);
  };

  const doLogout = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    resetInactivityTimer();
  };

  const logout = async () => {
    try {
      if (token) await api.post("/auth/logout");
    } catch {}
    doLogout();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
};