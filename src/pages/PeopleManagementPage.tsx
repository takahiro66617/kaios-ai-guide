import { useEffect, useMemo, useState } from "react";
import {
  UserPlus, Pencil, Trash2, Users, Building2, KeyRound, ShieldCheck, ShieldOff,
  Power, PowerOff, Loader2, Copy, LinkIcon, Eye, EyeOff,
} from "lucide-react";
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

function validateUsername(u: string): string | null {
  if (u.length < 3 || u.length > 64) return "ユーザー名は3〜64文字で入力してください";
  if (/\s/.test(u)) return "ユーザー名に空白を含めることはできません";
  if (u.includes("@")) return "ユーザー名に @ を含めることはできません";
  return null;
}

const PeopleManagementPage = () => {
  const { people, deletePerson, getKaizenByPerson, refreshPeople } = useKaios();
  const { user: currentUser } = useAuth();

  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // ----- Add / Issue dialog -----
  // mode: "new" = create person + account; "link" = create account for existing person (link_person_id)
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"new" | "link">("new");
  const [linkTargetPerson, setLinkTargetPerson] = useState<Person | null>(null);
  const [fName, setFName] = useState("");
  const [fDept, setFDept] = useState(DEPARTMENTS[0]);
  const [fRole, setFRole] = useState("");
  const [fYears, setFYears] = useState(1);
  const [fUsername, setFUsername] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fIsAdmin, setFIsAdmin] = useState(false);
  const [adding, setAdding] = useState(false);

  // ----- Edit dialog -----
  const [editTarget, setEditTarget] = useState<Person | null>(null);
  const [eName, setEName] = useState("");
  const [eUsername, setEUsername] = useState("");
  const [eDept, setEDept] = useState(DEPARTMENTS[0]);
  const [eRole, setERole] = useState("");
  const [eYears, setEYears] = useState(1);
  const [editSaving, setEditSaving] = useState(false);

  // ----- Reset password dialog -----
  const [resetTarget, setResetTarget] = useState<Person | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetReveal, setResetReveal] = useState(false);

  // ----- Delete confirm -----
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);

  // ----- Credential reveal modal (one-time) -----
  const [credentialModal, setCredentialModal] = useState<{ username: string; password: string; name: string } | null>(null);

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

  const resetAddForm = () => {
    setFName(""); setFDept(DEPARTMENTS[0]); setFRole(""); setFYears(1);
    setFUsername(""); setFPassword(""); setFIsAdmin(false);
    setLinkTargetPerson(null); setAddMode("new");
  };

  const openAddNew = () => {
    resetAddForm();
    setAddOpen(true);
  };

  const openIssueForExisting = (person: Person) => {
    resetAddForm();
    setAddMode("link");
    setLinkTargetPerson(person);
    setFName(person.name);
    setFDept(person.department);
    setFRole(person.role || "");
    setFYears(person.yearsAtCompany);
    // suggest a username
    setFUsername(romanize(person.name) || "");
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!fName.trim()) { toast.error("氏名を入力してください"); return; }
    const trimmedU = fUsername.trim();
    const uErr = validateUsername(trimmedU);
    if (uErr) { toast.error(uErr); return; }
    if (fPassword.length < 6) { toast.error("パスワードは6文字以上必要です"); return; }
    setAdding(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        username: trimmedU,
        password: fPassword,
        display_name: fName.trim(),
        department: fDept,
        role_title: fRole.trim(),
        years_at_company: fYears,
        is_admin: fIsAdmin,
        link_person_id: addMode === "link" ? linkTargetPerson?.id : undefined,
      },
    });
    setAdding(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "作成に失敗しました");
      return;
    }
    setAddOpen(false);
    setCredentialModal({
      name: fName.trim(),
      username: (data as any).username,
      password: (data as any).password,
    });
    resetAddForm();
    await Promise.all([refreshPeople(), loadAuthData()]);
  };

  const openEdit = (person: Person) => {
    setEditTarget(person);
    setEName(person.name);
    setEDept(person.department);
    setERole(person.role || "");
    setEYears(person.yearsAtCompany);
    setEUsername(person.userId ? (profiles[person.userId]?.username ?? "") : "");
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    if (!eName.trim()) { toast.error("氏名を入力してください"); return; }
    let usernameChanged = false;
    if (editTarget.userId) {
      const cur = profiles[editTarget.userId]?.username ?? "";
      const next = eUsername.trim();
      if (next !== cur) {
        const err = validateUsername(next);
        if (err) { toast.error(err); return; }
        usernameChanged = true;
      }
    }
    setEditSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-update-user", {
      body: {
        person_id: editTarget.id,
        user_id: editTarget.userId,
        display_name: eName.trim(),
        department: eDept,
        role_title: eRole.trim(),
        years_at_company: eYears,
        ...(usernameChanged ? { username: eUsername.trim() } : {}),
      },
    });
    setEditSaving(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "更新に失敗しました");
      return;
    }
    toast.success("更新しました");
    setEditTarget(null);
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
    const username = profiles[resetTarget.userId]?.username ?? "";
    setCredentialModal({ name: resetTarget.name, username, password: resetPw });
    setResetTarget(null); setResetPw(""); setResetReveal(false);
    await loadAuthData();
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
    }
    // delete people row regardless (kaizen_items kept via author_name_snapshot)
    await deletePerson(deleteTarget.id);
    toast.success(`${deleteTarget.name} を削除しました`);
    setDeleteTarget(null);
    await Promise.all([refreshPeople(), loadAuthData()]);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} をコピーしました`);
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const visiblePeople = useMemo(() => people, [people]);

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
              提案者の登録・編集・アカウント発行・パスワード再発行・権限管理を行います。
            </p>
          </div>
          <Button className="gap-1.5" onClick={openAddNew}>
            <UserPlus className="w-4 h-4" />
            新規にアカウントを発行
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">登録者数</p><p className="text-xl font-bold">{visiblePeople.filter(p => p.isActive).length}名</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">所属部門数</p><p className="text-xl font-bold">{new Set(visiblePeople.filter(p => p.isActive).map(p => p.department)).size}</p></div>
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
                {visiblePeople.map((person) => {
                  const prof = person.userId ? profiles[person.userId] : null;
                  const isAdmin = person.userId ? adminUserIds.has(person.userId) : false;
                  const isActive = prof?.is_active ?? person.isActive;
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
                          {prof && (
                            <span className="text-foreground/70 inline-flex items-center gap-1">
                              ID: {prof.username}
                              <button
                                type="button"
                                className="opacity-60 hover:opacity-100"
                                onClick={() => copy(prof.username, "ログインID")}
                                title="IDをコピー"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                          <span className="text-primary">{kaizenCount}件の改善案</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="編集" onClick={() => openEdit(person)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {!linked && (
                          <Button variant="outline" size="sm" className="h-8 gap-1" title="この提案者にアカウントを発行"
                            onClick={() => openIssueForExisting(person)}>
                            <LinkIcon className="w-3.5 h-3.5" />
                            アカウント発行
                          </Button>
                        )}
                        {linked && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="パスワード再発行"
                              onClick={() => { setResetTarget(person); setResetPw(""); setResetReveal(false); }}>
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
                {visiblePeople.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    登録者がまだいません。「新規にアカウントを発行」から作成してください。
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Link Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {addMode === "link" ? `${linkTargetPerson?.name} にアカウントを発行` : "アカウントを新規発行"}
            </DialogTitle>
            <DialogDescription>
              {addMode === "link"
                ? "既存の提案者にログインアカウントを紐付けます。"
                : "提案者プロフィールとログインアカウントを同時に作成します。"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>表示名（氏名） <span className="text-destructive">*</span></Label>
              <Input value={fName} onChange={e => setFName(e.target.value)} placeholder="例: 山田 太郎" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ログインID <span className="text-destructive">*</span></Label>
                <Input value={fUsername} onChange={e => setFUsername(e.target.value)} placeholder="例: yamada-taro" className="mt-1" />
                <p className="text-[10px] text-muted-foreground mt-1">3〜64文字 / 空白と @ は使えません</p>
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

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget?.name} を編集</DialogTitle>
            <DialogDescription>
              提案者情報と{editTarget?.userId ? "ログインID" : "（未紐付け）"}を編集できます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>表示名（氏名） <span className="text-destructive">*</span></Label>
              <Input value={eName} onChange={e => setEName(e.target.value)} className="mt-1" />
              <p className="text-[10px] text-muted-foreground mt-1">変更すると過去投稿の表示名スナップショットも更新します。</p>
            </div>
            {editTarget?.userId && (
              <div>
                <Label>ログインID</Label>
                <Input value={eUsername} onChange={e => setEUsername(e.target.value)} className="mt-1" />
                <p className="text-[10px] text-muted-foreground mt-1">3〜64文字 / 空白と @ は使えません。変更すると本人は新IDでログインする必要があります。</p>
              </div>
            )}
            <div>
              <Label>部門</Label>
              <select value={eDept} onChange={e => setEDept(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>役職</Label>
                <Input value={eRole} onChange={e => setERole(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>入社年数</Label>
                <Input type="number" min={1} max={50} value={eYears} onChange={e => setEYears(Number(e.target.value))} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={editSaving}>キャンセル</Button></DialogClose>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset PW Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) { setResetTarget(null); setResetPw(""); setResetReveal(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{resetTarget?.name} のパスワード再発行</DialogTitle>
            <DialogDescription>
              新しいパスワードを設定します。発行後に画面で1度だけ表示されます。
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>新しいパスワード</Label>
            <div className="relative mt-1">
              <Input
                type={resetReveal ? "text" : "password"}
                value={resetPw}
                onChange={e => setResetPw(e.target.value)}
                placeholder="6文字以上"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setResetReveal(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {resetReveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
              ログインアカウントと提案者情報を削除します。本人が投稿した改善案は削除時点の表示名で残ります。この操作は取り消せません。
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

      {/* Credential Reveal (one-time) */}
      <Dialog open={!!credentialModal} onOpenChange={(o) => { if (!o) setCredentialModal(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ログイン情報（1度だけ表示）</DialogTitle>
            <DialogDescription>
              この画面を閉じるとパスワードは二度と表示できません。今すぐ本人にお伝えください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">対象</Label>
              <p className="text-sm font-medium">{credentialModal?.name}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">ログインID</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 rounded-md bg-muted text-sm font-mono break-all">{credentialModal?.username}</code>
                <Button size="icon" variant="outline" className="h-9 w-9 shrink-0"
                  onClick={() => credentialModal && copy(credentialModal.username, "ログインID")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">パスワード</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 rounded-md bg-muted text-sm font-mono break-all">{credentialModal?.password}</code>
                <Button size="icon" variant="outline" className="h-9 w-9 shrink-0"
                  onClick={() => credentialModal && copy(credentialModal.password, "パスワード")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => credentialModal && copy(
                `ログインID: ${credentialModal.username}\nパスワード: ${credentialModal.password}`,
                "ログイン情報",
              )}
            >
              <Copy className="w-4 h-4 mr-2" />
              ID + パスワードをまとめてコピー
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setCredentialModal(null)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

// rough kana/japanese stripper for ID suggestion fallback
function romanize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 32);
}

export default PeopleManagementPage;
