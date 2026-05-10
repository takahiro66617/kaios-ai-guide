import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

const EMAIL_DOMAIN = "kaios.local";

export type AppRole = "admin" | "manager" | "employee";

export interface AuthProfile {
  user_id: string;
  username: string;
  display_name: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  role: AppRole;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  managedDepartments: string[];
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [role, setRole] = useState<AppRole>("employee");
  const [managedDepartments, setManagedDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfileAndRole = async (uid: string) => {
    const [{ data: prof }, { data: roles }, { data: depts }] = await Promise.all([
      supabase.from("profiles").select("user_id, username, display_name, is_active").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("manager_departments").select("department").eq("user_id", uid),
    ]);
    setProfile(prof as AuthProfile | null);

    const roleSet = new Set((roles ?? []).map((r: any) => r.role as string));
    // Highest role wins: admin > manager > employee
    const resolved: AppRole = roleSet.has("admin")
      ? "admin"
      : roleSet.has("manager")
      ? "manager"
      : "employee";
    setRole(resolved);
    setManagedDepartments((depts ?? []).map((d: any) => d.department));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadProfileAndRole(sess.user.id), 0);
      } else {
        setProfile(null);
        setRole("employee");
        setManagedDepartments([]);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfileAndRole(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (username: string, password: string) => {
    const u = username.trim().toLowerCase();
    if (!u || !password) return { ok: false, error: "ユーザー名とパスワードを入力してください" };
    const email = `${u}@${EMAIL_DOMAIN}`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: "ユーザー名またはパスワードが正しくありません" };
    return { ok: true };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole("employee");
    setManagedDepartments([]);
  };

  const refreshProfile = async () => {
    if (user) await loadProfileAndRole(user.id);
  };

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isEmployee = role === "employee";

  return (
    <AuthContext.Provider value={{
      user, session, profile, role, isAdmin, isManager, isEmployee,
      managedDepartments, loading, signIn, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
