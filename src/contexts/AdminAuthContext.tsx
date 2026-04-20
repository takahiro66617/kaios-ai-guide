import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminAuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const STORAGE_KEY = "kaios_admin_token";
const EXPIRES_KEY = "kaios_admin_expires";
const EXPIRES_MS = 12 * 60 * 60 * 1000; // 12時間

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
};

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    const expires = localStorage.getItem(EXPIRES_KEY);
    if (token && expires && Date.now() < Number(expires)) {
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    }
    setLoading(false);
  }, []);

  const login = async (password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-auth", {
        body: { password },
      });
      if (error) return { ok: false, error: error.message };
      if (!data?.ok) return { ok: false, error: data?.error || "認証に失敗しました" };

      localStorage.setItem(STORAGE_KEY, data.token);
      localStorage.setItem(EXPIRES_KEY, String(Date.now() + EXPIRES_MS));
      setIsAuthenticated(true);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "認証エラー" };
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
