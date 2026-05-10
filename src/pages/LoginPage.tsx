import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Loader2, ShieldCheck, Users, KeyRound, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type LoginPortal = "employee" | "manager" | "admin";

interface LoginPageProps {
  portal?: LoginPortal;
}

const portalConfig: Record<LoginPortal, {
  label: string;
  subtitle: string;
  ctaLabel: string;
  homePath: string;
  theme: "light" | "manager" | "admin";
  icon: typeof Users;
  demo: { username: string; password: string; label: string }[];
}> = {
  employee: {
    label: "現場メンバー ログイン",
    subtitle: "改善を投稿しよう",
    ctaLabel: "ログイン",
    homePath: "/",
    theme: "light",
    icon: Users,
    demo: [
      { username: "yamada", password: "kaios1234", label: "現場メンバー（山田）" },
      { username: "sato", password: "kaios1234", label: "現場メンバー（佐藤）" },
    ],
  },
  manager: {
    label: "マネージャー ログイン",
    subtitle: "部署管理ポータル",
    ctaLabel: "マネージャーとしてログイン",
    homePath: "/admin/dashboard",
    theme: "manager",
    icon: Briefcase,
    demo: [
      { username: "tanaka", password: "manager1234", label: "マネージャー（田中）" },
    ],
  },
  admin: {
    label: "Admin Console",
    subtitle: "管理者ログイン",
    ctaLabel: "管理者としてログイン",
    homePath: "/admin/dashboard",
    theme: "admin",
    icon: ShieldCheck,
    demo: [
      { username: "admin", password: "admin1234", label: "管理者（admin）" },
    ],
  },
};

const roleHomePath = (role: AppRole): string =>
  role === "admin" || role === "manager" ? "/admin/dashboard" : "/";

const LoginPage = ({ portal = "employee" }: LoginPageProps) => {
  const { user, role, signIn, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const cfg = portalConfig[portal];
  const from = (location.state as any)?.from?.pathname;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // すでにログイン済みなら、自分の役割の初期画面へ（ポータル誤訪問でも親切に誘導）
  if (!loading && user) {
    return <Navigate to={from || roleHomePath(role)} replace />;
  }

  const isDemoAccount = (u: string, p: string) =>
    Object.values(portalConfig)
      .flatMap((c) => c.demo)
      .some((c) => c.username === u.trim().toLowerCase() && c.password === p);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let res = await signIn(username, password);

    if (!res.ok && isDemoAccount(username, password)) {
      const { error: seedErr } = await supabase.functions.invoke("seed-demo-accounts", { body: {} });
      if (seedErr) {
        setSubmitting(false);
        toast.error("デモアカウントの初期化に失敗しました");
        return;
      }
      toast.message("デモアカウントを初期化しました。再ログインします…");
      res = await signIn(username, password);
    }

    if (!res.ok) {
      setSubmitting(false);
      toast.error(res.error || "ログインに失敗しました");
      return;
    }

    // 認証成功 → 実際のロールを取得して、ポータルと一致するか厳格チェック
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id;
    if (!uid) {
      setSubmitting(false);
      toast.error("セッション取得に失敗しました");
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    const roleSet = new Set((roles ?? []).map((r: any) => r.role as string));
    const actualRole: AppRole = roleSet.has("admin")
      ? "admin"
      : roleSet.has("manager")
      ? "manager"
      : "employee";

    // ポータルと実ロールの一致判定（A: 厳格）
    const portalAccepts: Record<LoginPortal, (r: AppRole) => boolean> = {
      admin: (r) => r === "admin",
      manager: (r) => r === "manager",
      employee: (r) => r === "employee",
    };

    if (!portalAccepts[portal](actualRole)) {
      setSubmitting(false);
      const correctUrl =
        actualRole === "admin"
          ? "/login/admin"
          : actualRole === "manager"
          ? "/login/manager"
          : "/login";
      toast.error(
        `このログイン画面はあなたの権限では使用できません。正しいログイン: ${correctUrl}`,
      );
      await signOut();
      return;
    }

    setSubmitting(false);
    toast.success(`${cfg.label}しました`);
    navigate(from || cfg.homePath, { replace: true });
  };

  // テーマ別スタイル
  const themeStyles = {
    light: {
      bg: "bg-gradient-to-br from-sky-50 via-white to-emerald-50",
      card: "border-sky-200",
      iconBg: "bg-gradient-to-br from-sky-500 to-emerald-500",
      subtitle: "text-sky-700",
      input: "",
      label: "",
      button:
        "bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700",
      demoBtn: "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700",
      demoLabel: "text-sky-700",
      borderTop: "border-slate-200",
      hint: "text-slate-600",
    },
    manager: {
      bg: "bg-gradient-to-br from-indigo-50 via-white to-slate-100",
      card: "border-indigo-300",
      iconBg: "bg-gradient-to-br from-indigo-500 to-violet-600",
      subtitle: "text-indigo-700 uppercase tracking-wider",
      input: "",
      label: "",
      button:
        "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700",
      demoBtn: "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700",
      demoLabel: "text-indigo-700",
      borderTop: "border-slate-200",
      hint: "text-slate-600",
    },
    admin: {
      bg: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
      card: "border-amber-500/30 bg-slate-900/70 backdrop-blur text-slate-100",
      iconBg: "bg-gradient-to-br from-amber-500 to-rose-500",
      subtitle: "text-amber-400 uppercase tracking-wider",
      input: "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500",
      label: "text-slate-200",
      button:
        "bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600",
      demoBtn: "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200",
      demoLabel: "text-amber-400",
      borderTop: "border-slate-700",
      hint: "text-slate-400",
    },
  }[cfg.theme];

  const Icon = cfg.icon;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${themeStyles.bg}`}>
      <Card className={`w-full max-w-md shadow-xl transition-colors ${themeStyles.card}`}>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${themeStyles.iconBg}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight block leading-tight">KAIOS</span>
              <span className={`text-xs font-medium ${themeStyles.subtitle}`}>{cfg.label}</span>
            </div>
          </div>
          <CardTitle className="text-xl">{cfg.subtitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className={themeStyles.label}>ユーザー名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={portal === "admin" ? "admin" : "例: yamada"}
                autoComplete="username"
                className={`mt-1 ${themeStyles.input}`}
              />
            </div>
            <div>
              <Label htmlFor="password" className={themeStyles.label}>パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={`mt-1 ${themeStyles.input}`}
              />
            </div>
            <Button
              type="submit"
              className={`w-full text-white border-0 ${themeStyles.button}`}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {cfg.ctaLabel}
            </Button>
          </form>

          {cfg.demo.length > 0 && (
            <div className={`mt-6 pt-4 border-t ${themeStyles.borderTop}`}>
              <p className={`text-xs font-semibold mb-2 flex items-center gap-1 ${themeStyles.hint}`}>
                <KeyRound className="w-3 h-3" />
                デモ用アカウント（クリックで自動入力）
              </p>
              <div className="space-y-1.5">
                {cfg.demo.map((cred) => (
                  <button
                    key={cred.username}
                    type="button"
                    onClick={() => {
                      setUsername(cred.username);
                      setPassword(cred.password);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-mono transition-colors ${themeStyles.demoBtn}`}
                  >
                    <div className={`font-sans font-medium text-[11px] mb-0.5 ${themeStyles.demoLabel}`}>
                      {cred.label}
                    </div>
                    <div>ID: {cred.username} / PW: {cred.password}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 別ポータルへの誘導リンク */}
          <div className={`mt-6 pt-4 border-t ${themeStyles.borderTop} text-xs ${themeStyles.hint} space-y-1`}>
            <p className="font-semibold mb-2">別の権限の方はこちら：</p>
            {portal !== "employee" && (
              <Link to="/login" className="block hover:underline">→ 現場メンバー ログイン</Link>
            )}
            {portal !== "manager" && (
              <Link to="/login/manager" className="block hover:underline">→ マネージャー ログイン</Link>
            )}
            {portal !== "admin" && (
              <Link to="/login/admin" className="block hover:underline">→ 管理者ログイン</Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
