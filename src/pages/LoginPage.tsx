import { FormEvent, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { Loader2, ShieldCheck, Users, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Mode = "member" | "admin";

const demoCredentials: Record<Mode, { username: string; password: string; label: string }[]> = {
  member: [
    { username: "yamada", password: "kaios1234", label: "現場メンバー（山田）" },
    { username: "sato", password: "kaios1234", label: "現場メンバー（佐藤）" },
  ],
  admin: [
    { username: "admin", password: "admin1234", label: "管理者（admin）" },
  ],
};

const LoginPage = () => {
  const { user, isAdmin, signIn, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  const [mode, setMode] = useState<Mode>("member");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={isAdmin && from === "/" ? "/admin/dashboard" : from} replace />;
  }

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  const isDemoAccount = (u: string, p: string) =>
    [...demoCredentials.member, ...demoCredentials.admin].some(
      (c) => c.username === u.trim().toLowerCase() && c.password === p,
    );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let res = await signIn(username, password);

    // If a demo account fails (not yet seeded / password drift), seed and retry once.
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

    if (mode === "admin") {
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
      const admin = (roles ?? []).some((r: any) => r.role === "admin");
      setSubmitting(false);
      if (!admin) {
        toast.error("管理者権限がありません。サインアウトします。");
        await signOut();
        return;
      }
      toast.success("管理者としてログインしました");
      navigate(from === "/" ? "/admin/dashboard" : from, { replace: true });
    } else {
      setSubmitting(false);
      toast.success("ログインしました");
      navigate(from, { replace: true });
    }
  };

  const isAdminMode = mode === "admin";

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
        isAdminMode
          ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
          : "bg-gradient-to-br from-sky-50 via-white to-emerald-50"
      }`}
    >
      <Card
        className={`w-full max-w-md shadow-xl transition-colors ${
          isAdminMode
            ? "border-amber-500/30 bg-slate-900/70 backdrop-blur text-slate-100"
            : "border-sky-200"
        }`}
      >
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                isAdminMode
                  ? "bg-gradient-to-br from-amber-500 to-rose-500"
                  : "bg-gradient-to-br from-sky-500 to-emerald-500"
              }`}
            >
              {isAdminMode ? (
                <ShieldCheck className="w-5 h-5 text-white" />
              ) : (
                <Users className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight block leading-tight">KAIOS</span>
              <span
                className={`text-xs font-medium ${
                  isAdminMode ? "text-amber-400 uppercase tracking-wider" : "text-sky-700"
                }`}
              >
                {isAdminMode ? "Admin Console" : "現場メンバー ログイン"}
              </span>
            </div>
          </div>
          <CardTitle className="text-xl">ログイン</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mb-4">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="member">現場メンバー</TabsTrigger>
              <TabsTrigger value="admin">管理者</TabsTrigger>
            </TabsList>
            <TabsContent value="member" />
            <TabsContent value="admin" />
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className={isAdminMode ? "text-slate-200" : ""}>
                ユーザー名
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isAdminMode ? "admin" : "例: yamada"}
                autoComplete="username"
                className={`mt-1 ${
                  isAdminMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500" : ""
                }`}
              />
            </div>
            <div>
              <Label htmlFor="password" className={isAdminMode ? "text-slate-200" : ""}>
                パスワード
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={`mt-1 ${
                  isAdminMode ? "bg-slate-800 border-slate-700 text-slate-100" : ""
                }`}
              />
            </div>
            <Button
              type="submit"
              className={`w-full text-white border-0 ${
                isAdminMode
                  ? "bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600"
                  : "bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700"
              }`}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isAdminMode ? "管理者としてログイン" : "ログイン"}
            </Button>
          </form>

          <div
            className={`mt-6 pt-4 border-t ${
              isAdminMode ? "border-slate-700" : "border-slate-200"
            }`}
          >
            <p
              className={`text-xs font-semibold mb-2 flex items-center gap-1 ${
                isAdminMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              <KeyRound className="w-3 h-3" />
              デモ用アカウント（クリックで自動入力）
            </p>
            <div className="space-y-1.5">
              {demoCredentials[mode].map((cred) => (
                <button
                  key={cred.username}
                  type="button"
                  onClick={() => fillCredentials(cred.username, cred.password)}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs font-mono transition-colors ${
                    isAdminMode
                      ? "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
                      : "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
                  }`}
                >
                  <div
                    className={`font-sans font-medium text-[11px] mb-0.5 ${
                      isAdminMode ? "text-amber-400" : "text-sky-700"
                    }`}
                  >
                    {cred.label}
                  </div>
                  <div>
                    ID: {cred.username} / PW: {cred.password}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
