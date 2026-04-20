import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Sparkles, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LoginPage = () => {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  if (!loading && user) return <Navigate to={from} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await signIn(username, password);
    setSubmitting(false);
    if (res.ok) {
      toast.success("ログインしました");
      navigate(from, { replace: true });
    } else {
      toast.error(res.error || "ログインに失敗しました");
    }
  };

  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      const { data, error } = await supabase.functions.invoke("bootstrap-admin", {
        body: { username: "admin", password: "admin1234", display_name: "管理者" },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "失敗しました");
      } else {
        toast.success("初期管理者を作成しました（admin / admin1234）");
        setUsername("admin");
        setPassword("admin1234");
      }
    } finally {
      setBootstrapping(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-kaios-surface p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">KAIOS</span>
          </div>
          <CardTitle>ログイン</CardTitle>
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
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              ログイン
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              初回セットアップ：管理者アカウントが未作成の場合のみ動作します。
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={handleBootstrap}
              disabled={bootstrapping}
            >
              <ShieldCheck className="w-4 h-4" />
              {bootstrapping ? "作成中…" : "初期管理者(admin / admin1234)を作成"}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
              ← ホームへ戻る
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
