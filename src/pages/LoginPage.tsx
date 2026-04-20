import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Sparkles, Loader2, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const LoginPage = () => {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to={from} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await signIn(username, password);
    setSubmitting(false);
    if (res.ok) {
      toast.success("ログインしました");
      // 現場ログインからは管理者でも常にダッシュボードへ
      navigate(from === "/admin/login" ? "/" : from, { replace: true });
    } else {
      toast.error(res.error || "ログインに失敗しました");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-4">
      <Card className="w-full max-w-md border-sky-200 shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight block leading-tight">KAIOS</span>
              <span className="text-xs text-sky-700 font-medium">現場メンバー ログイン</span>
            </div>
          </div>
          <CardTitle className="text-xl">ログイン</CardTitle>
          <p className="text-sm text-muted-foreground">
            管理者から発行されたユーザー名とパスワードを入力してください。
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">ユーザー名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例: yamada"
                autoComplete="username"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              ログイン
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border flex items-center justify-between text-xs">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              ← ホームへ戻る
            </Link>
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              管理者ログイン
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
