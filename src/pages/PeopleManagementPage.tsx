import { useEffect, useMemo, useState } from "react";
import {
  UserPlus, Users, Building2, ShieldCheck, Loader2, Copy, LinkIcon, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useKaios, type Person } from "@/contexts/KaiosContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription,
} from "@/components/ui/dialog";
import AccountDetailModal from "@/components/people/AccountDetailModal";
import { useDepartments } from "@/hooks/useDepartments";

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
  const { people, getKaizenByPerson, refreshPeople } = useKaios();
  const { user: currentUser } = useAuth();
  const { departments } = useDepartments(false);

  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // ----- Add / Issue dialog -----
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"new" | "link">("new");
  const [linkTargetPerson, setLinkTargetPerson] = useState<Person | null>(null);
  const [fName, setFName] = useState("");
  const [fDept, setFDept] = useState("");
  const [fRole, setFRole] = useState("");
  const [fYears, setFYears] = useState(1);
  const [fUsername, setFUsername] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fIsAdmin, setFIsAdmin] = useState(false);
  const [adding, setAdding] = useState(false);

  // ----- Detail modal -----
  const [detailTarget, setDetailTarget] = useState<Person | null>(null);

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
    setFName(""); setFDept(departments[0]?.name ?? ""); setFRole(""); setFYears(1);
    setFUsername(""); setFPassword(""); setFIsAdmin(false);
    setLinkTargetPerson(null); setAddMode("new");
  };

  const openAddNew = () => { resetAddForm(); setAddOpen(true); };

  const openIssueForExisting = (person: Person) => {
    resetAddForm();
    setAddMode("link");
    setLinkTargetPerson(person);
    setFName(person.name);
    setFDept(person.department);
    setFRole(person.role || "");
    setFYears(person.yearsAtCompany);
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

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} をコピーしました`);
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const visiblePeople = useMemo(() => people, [people]);

  // The currently-detailed person can be re-derived from people each render to reflect refreshes
  const detailPerson = detailTarget ? people.find(p => p.id === detailTarget.id) ?? null : null;
  const detailProfile = detailPerson?.userId ? profiles[detailPerson.userId] ?? null : null;
  const detailIsAdmin = detailPerson?.userId ? adminUserIds.has(detailPerson.userId) : false;
  const detailIsSelf = detailPerson?.userId === currentUser?.id;

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
              提案者ごとにアカウント発行・編集・パスワード再発行・権限/状態の管理・活動状況の確認・削除を行えます。
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
          <CardHeader>
            <CardTitle className="text-base">登録済みアカウント</CardTitle>
            <p className="text-xs text-muted-foreground">
              各行の「詳細管理」から、氏名/ID/部門/役職の編集、パスワード再発行、権限・状態切替、活動状況の確認、削除を行います。
            </p>
          </CardHeader>
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
                      <div className="flex items-center gap-2 shrink-0">
                        {!linked ? (
                          <Button variant="outline" size="sm" className="gap-1.5"
                            onClick={() => openIssueForExisting(person)}>
                            <LinkIcon className="w-3.5 h-3.5" />
                            アカウント発行
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="gap-1.5"
                            onClick={() => setDetailTarget(person)}>
                            <Settings2 className="w-3.5 h-3.5" />
                            詳細管理
                          </Button>
                        )}
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
              <Select value={fDept} onValueChange={setFDept}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="部門を選択" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {departments.length === 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">部門が未登録です。管理者ダッシュボードから「部門マスタ」を登録してください。</p>
              )}
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

      {/* Detail Modal (consolidated) */}
      <AccountDetailModal
        person={detailPerson}
        open={!!detailTarget}
        onOpenChange={(o) => { if (!o) setDetailTarget(null); }}
        profile={detailProfile}
        isAdmin={detailIsAdmin}
        isSelf={detailIsSelf}
        onChanged={async () => { await Promise.all([refreshPeople(), loadAuthData()]); }}
        onRequestCredentialReveal={(c) => setCredentialModal(c)}
      />

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
