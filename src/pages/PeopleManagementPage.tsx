import { useEffect, useState } from "react";
import { UserPlus, Pencil, Trash2, Users, Building2, Check, KeyRound, ShieldCheck, ShieldOff, Power, PowerOff, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useKaios, type Person } from "@/contexts/KaiosContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DEPARTMENTS = [
  "カスタマーサポート部", "情報システム部", "営業部", "経営企画部",
  "製造部", "経理部", "物流部", "総務部", "人事部", "マーケティング部",
];

interface ProfileRow {
  user_id: string;
  username: string;
  display_name: string;
  is_active: boolean;
}

interface RoleRow { user_id: string; role: "admin" | "member"; }

const PeopleManagementPage = () => {
  const { people, deletePerson, getKaizenByPerson, refreshPeople } = useKaios();
  const { user: currentUser } = useAuth();

  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [fName, setFName] = useState("");
  const [fDept, setFDept] = useState(DEPARTMENTS[0]);
  const [fRole, setFRole] = useState("");
  const [fYears, setFYears] = useState(1);
  const [fUsername, setFUsername] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fIsAdmin, setFIsAdmin] = useState(false);
  const [adding, setAdding] = useState(false);

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<Person | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetting, setResetting] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);

  const loadAuthData = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id, username, display_name, is_active"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const pmap: Record<string, ProfileRow> = {};
    (profs || []).forEach((p: any) => { pmap[p.user_id] = p; });
    setProfiles(pmap);
    setAdminUserIds(new Set((roles || []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id)));
    setLoading(false);
  };

  useEffect(() => { loadAuthData(); }, []);

  const resetForm = () => {
    setFName(""); setFDept(DEPARTMENTS[0]); setFRole(""); setFYears(1);
    setFUsername(""); setFPassword(""); setFIsAdmin(false);
  };

  const handleAdd = async () => {
    if (!fName.trim()) { toast.error("氏名を入力してください"); return; }
    if (!/^[a-z0-9_.-]{3,32}$/.test(fUsername.trim().toLowerCase())) {
      toast.error("ユーザー名は3〜32文字の半角英数字・_.-で入力してください"); return;
    }
    if (fPassword.length < 6) { toast.error("パスワードは6文字以上必要です"); return; }
    setAdding(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        username: fUsername.trim().toLowerCase(),
        password: fPassword,
        display_name: fName.trim(),
        department: fDept,
        role_title: fRole.trim(),
        years_at_company: fYears,
        is_admin: fIsAdmin,
      },
    });
    setAdding(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "作成に失敗しました");
      return;
    }
    toast.success(`${fName} を作成しました`);
    setAddOpen(false);
    resetForm();
    await Promise.all([refreshPeople(), loadAuthData()]);
  };

  const handleResetPassword = async () => {
    if (!resetTarget?.userId) return;
    if (resetPw.length < 6) { toast.error("パスワードは6文字以上必要です"); return; }
    setResetting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "reset_password", user_id: resetTarget.userId, new_password: resetPw },
    });
    setResetting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "失敗しました"); return;
    }
    toast.success(`${resetTarget.name} のパスワードを更新しました`);
    setResetTarget(null); setResetPw("");
  };

  const handleToggleActive = async (person: Person) => {
    if (!person.userId) { toast.error("ログインアカウント未紐付けです"); return; }
    const prof = profiles[person.userId];
    const next = !(prof?.is_active ?? true);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "set_active", user_id: person.userId, is_active: next },
    });
    if (error || (data as any)?.error) { toast.error((data as any)?.error || "失敗"); return; }
    toast.success(next ? "有効化しました" : "無効化しました");
    await Promise.all([refreshPeople(), loadAuthData()]);
  };

  const handleToggleAdmin = async (person: Person) => {
    if (!person.userId) { toast.error("ログインアカウント未紐付けです"); return; }
    const next = !adminUserIds.has(person.userId);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "set_admin", user_id: person.userId, is_admin: next },
    });
    if (error || (data as any)?.error) { toast.error((data as any)?.error || "失敗"); return; }
    toast.success(next ? "管理者権限を付与しました" : "管理者権限を解除しました");
    await loadAuthData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.userId) {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "delete", user_id: deleteTarget.userId },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || "削除に失敗"); return;
      }
    } else {
      await deletePerson(deleteTarget.id);
    }
    toast.success(`${deleteTarget.name} を削除しました`);
    setDeleteTarget(null);
    await Promise.all([refreshPeople(), loadAuthData()]);
  };

  const activePeople = people.filter(p => p.isActive);

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-4 sm:p-6 max-w-[1100px] mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              提案者・アカウント管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              現場ユーザーのアカウント発行・パスワード再発行・権限管理を行います。
            </p>
          </div>
          <Button className="gap-1.5" onClick={() => { resetForm(); setAddOpen(true); }}>
            <UserPlus className="w-4 h-4" />
            アカウントを発行
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">登録者数</p><p className="text-xl font-bold">{activePeople.length}名</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">所属部門数</p><p className="text-xl font-bold">{new Set(activePeople.map(p => p.department)).size}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">管理者数</p><p className="text-xl font-bold">{adminUserIds.size}名</p></div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">登録済みアカウント</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-2">
                {activePeople.map((person) => {
                  const prof = person.userId ? profiles[person.userId] : null;
                  const isAdmin = person.userId ? adminUserIds.has(person.userId) : false;
                  const isActive = prof?.is_active ?? true;
                  const linked = !!person.userId;
                  const isSelf = person.userId === currentUser?.id;
                  const kaizenCount = getKaizenByPerson(person.id).length;
                  return (
                    <div key={person.id} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                        {person.avatarInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{person.name}</span>
                          {person.role && <Badge variant="outline" className="text-xs">{person.role}</Badge>}
                          {isAdmin && <Badge className="text-xs bg-primary/15 text-primary border-primary/30">管理者</Badge>}
                          {!linked && <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">未紐付け</Badge>}
                          {linked && !isActive && <Badge variant="outline" className="text-xs border-destructive text-destructive">無効</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                          <span>{person.department}</span>
                          <span>入社{person.yearsAtCompany}年目</span>
                          {prof && <span className="text-foreground/70">@{prof.username}</span>}
                          <span className="text-primary">{kaizenCount}件の改善案</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {linked && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="パスワード再発行"
                              onClick={() => { setResetTarget(person); setResetPw(""); }}>
                              <KeyRound className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={isAdmin ? "管理者権限を解除" : "管理者権限を付与"}
                              disabled={isSelf}
                              onClick={() => handleToggleAdmin(person)}>
                              {isAdmin ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={isActive ? "無効化" : "有効化"}
                              disabled={isSelf}
                              onClick={() => handleToggleActive(person)}>
                              {isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={isSelf}
                          onClick={() => setDeleteTarget(person)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {activePeople.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    登録者がまだいません。「アカウントを発行」から作成してください。
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>アカウントを発行</DialogTitle>
            <DialogDescription>現場ユーザーのログイン情報と提案者プロフィールを同時に作成します。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>表示名（氏名） <span className="text-destructive">*</span></Label>
              <Input value={fName} onChange={e => setFName(e.target.value)} placeholder="例: 山田 太郎" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ユーザー名(ログインID) <span className="text-destructive">*</span></Label>
                <Input value={fUsername} onChange={e => setFUsername(e.target.value)} placeholder="例: yamada" className="mt-1" />
                <p className="text-[10px] text-muted-foreground mt-1">3〜32文字 半角英数字・_.-</p>
              </div>
              <div>
                <Label>初期パスワード <span className="text-destructive">*</span></Label>
                <Input value={fPassword} onChange={e => setFPassword(e.target.value)} type="text" placeholder="6文字以上" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>部門</Label>
              <select value={fDept} onChange={e => setFDept(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>役職</Label>
                <Input value={fRole} onChange={e => setFRole(e.target.value)} placeholder="例: チームリーダー" className="mt-1" />
              </div>
              <div>
                <Label>入社年数</Label>
                <Input type="number" min={1} max={50} value={fYears} onChange={e => setFYears(Number(e.target.value))} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">管理者権限を付与</p>
                <p className="text-xs text-muted-foreground">評価方針・提案者管理・管理者ダッシュボードへのアクセス</p>
              </div>
              <Switch checked={fIsAdmin} onCheckedChange={setFIsAdmin} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={adding}>キャンセル</Button></DialogClose>
            <Button onClick={handleAdd} disabled={adding}>
              {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              発行する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset PW Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) { setResetTarget(null); setResetPw(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{resetTarget?.name} のパスワード再発行</DialogTitle>
            <DialogDescription>
              新しいパスワードを設定し、本人に直接お伝えください。
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>新しいパスワード</Label>
            <Input type="text" value={resetPw} onChange={e => setResetPw(e.target.value)} placeholder="6文字以上" className="mt-1" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={resetting}>キャンセル</Button></DialogClose>
            <Button onClick={handleResetPassword} disabled={resetting}>
              {resetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              再発行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTarget?.name}を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              ログインアカウント・提案者情報の両方を削除します。本人が投稿した改善案は残ります。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default PeopleManagementPage;
