import { useState, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AdminLoginPage = () => {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/admin";

  if (isAuthenticated) {
    navigate(from, { replace: true });
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    const result = await login(password);
    setSubmitting(false);
    if (result.ok) {
      toast.success("管理者としてログインしました");
      navigate(from, { replace: true });
    } else {
      toast.error(result.error || "ログインに失敗しました");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">管理者ログイン</h1>
          <p className="text-sm text-muted-foreground mt-1">
            経営層・管理者向けの画面です
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="管理者パスワードを入力"
              autoFocus
              disabled={submitting}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting || !password}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                認証中...
              </>
            ) : (
              "ログイン"
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-6">
          現場ユーザーはログイン不要です。<br />
          <a href="/" className="text-primary hover:underline">トップに戻る</a>
        </p>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
