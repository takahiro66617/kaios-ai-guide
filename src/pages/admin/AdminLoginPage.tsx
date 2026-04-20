import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Loader2, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminLoginPage = () => {
  const { user, isAdmin, signIn, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/admin/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && isAdmin) return <Navigate to={from} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await signIn(username, password);
    if (!res.ok) {
      setSubmitting(false);
      toast.error(res.error || "ログインに失敗しました");
      return;
    }
    // ロール確認
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
    navigate(from, { replace: true });
  };




  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md border-amber-500/30 bg-slate-900/70 backdrop-blur text-slate-100 shadow-2xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight block leading-tight">KAIOS</span>
              <span className="text-xs text-amber-400 font-semibold tracking-wider uppercase">
                Admin Console
              </span>
            </div>
          </div>
          <CardTitle className="text-xl flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            管理者ログイン
          </CardTitle>
          <p className="text-sm text-slate-400">
            管理者権限を持つアカウントのみ利用できます。
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-username" className="text-slate-200">
                管理者ユーザー名
              </Label>
              <Input
                id="admin-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                className="mt-1 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div>
              <Label htmlFor="admin-password" className="text-slate-200">
                パスワード
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white border-0"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              管理者としてログイン
            </Button>
          </form>


          <div className="mt-4 text-center">
            <Link to="/login" className="text-xs text-slate-400 hover:text-slate-200">
              ← 現場メンバーのログインへ
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
