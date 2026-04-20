import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Copy, Eye, EyeOff, ShieldCheck, Trash2, Trophy, Heart, Flame, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useKaios, type Person } from "@/contexts/KaiosContext";
import { LEVEL_TITLES, LEVEL_THRESHOLDS } from "@/contexts/GuestProfileContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepartments } from "@/hooks/useDepartments";

function validateUsername(u: string): string | null {
  if (u.length < 3 || u.length > 64) return "ユーザー名は3〜64文字で入力してください";
  if (/\s/.test(u)) return "ユーザー名に空白を含めることはできません";
  if (u.includes("@")) return "ユーザー名に @ を含めることはできません";
  return null;
}

interface ProfileRow {
  user_id: string; username: string; display_name: string; is_active: boolean;
}

interface GuestStats {
  level: number; xp: number; totalSubmissions: number; consecutiveDays: number;
  lastActiveDate: string | null;
  completedMissions: { title: string; icon: string; xpReward: number; completedAt: string | null }[];
  totalMissions: number;
  likesReceived: number;
}

interface Props {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileRow | null;
  isAdmin: boolean;
  isSelf: boolean;
  onChanged: () => Promise<void>;
  onRequestCredentialReveal: (cred: { name: string; username: string; password: string }) => void;
}

const AccountDetailModal = ({
  person, open, onOpenChange, profile, isAdmin, isSelf, onChanged, onRequestCredentialReveal,
}: Props) => {
  const { getKaizenByPerson, deletePerson, refreshPeople } = useKaios();

  const { departments } = useDepartments(false);

  // Basic info
  const [eName, setEName] = useState("");
  const [eUsername, setEUsername] = useState("");
  const [eDept, setEDept] = useState("");
  const [eRole, setERole] = useState("");
  const [eYears, setEYears] = useState(1);
  const [savingBasic, setSavingBasic] = useState(false);

  // Password
  const [resetPw, setResetPw] = useState("");
  const [resetReveal, setResetReveal] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Roles/state - reflected from props
  const [togglingAdmin, setTogglingAdmin] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Gamification
  const [stats, setStats] = useState<GuestStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const isActive = profile?.is_active ?? person?.isActive ?? true;
  const linked = !!person?.userId;
  const kaizenItems = useMemo(() => (person ? getKaizenByPerson(person.id) : []), [person, getKaizenByPerson]);

  // Sync form when person changes
  useEffect(() => {
    if (!person) return;
    setEName(person.name);
    setEDept(person.department);
    setERole(person.role || "");
    setEYears(person.yearsAtCompany);
    setEUsername(profile?.username ?? "");
    setResetPw(""); setResetReveal(false); setConfirmDelete(false);
    setStats(null);
  }, [person, profile?.username]);

  // Load gamification stats when modal opens
  useEffect(() => {
    if (!open || !person?.userId) return;
    let cancelled = false;
    (async () => {
      setLoadingStats(true);
      const guestId = person.userId!;
      const [profRes, missionsRes, progressRes, likesRes] = await Promise.all([
        supabase.from("guest_profiles").select("*").eq("guest_id", guestId).maybeSingle(),
        supabase.from("missions").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("mission_progress").select("*").eq("guest_id", guestId),
        supabase.from("likes").select("kaizen_item_id"),
      ]);
      if (cancelled) return;
      const gp = profRes.data;
      const missions = missionsRes.data || [];
      const progress = progressRes.data || [];
      const completed = progress
        .filter((p: any) => p.is_completed)
        .map((p: any) => {
          const m = missions.find((x: any) => x.id === p.mission_id);
          return m ? {
            title: m.title, icon: m.icon, xpReward: m.xp_reward, completedAt: p.completed_at,
          } : null;
        })
        .filter(Boolean) as GuestStats["completedMissions"];

      // Likes received: count likes whose kaizen_item belongs to person.id
      const myItemIds = new Set(kaizenItems.map(k => k.id));
      const likesReceived = (likesRes.data || []).filter((l: any) => myItemIds.has(l.kaizen_item_id)).length;

      setStats({
        level: gp?.level ?? 1,
        xp: gp?.xp ?? 0,
        totalSubmissions: gp?.total_submissions ?? kaizenItems.length,
        consecutiveDays: gp?.consecutive_days ?? 0,
        lastActiveDate: gp?.last_active_date ?? null,
        completedMissions: completed,
        totalMissions: missions.length,
        likesReceived,
      });
      setLoadingStats(false);
    })();
    return () => { cancelled = true; };
  }, [open, person?.userId, kaizenItems]);

  if (!person) return null;

  // ----- Handlers -----
  const handleSaveBasic = async () => {
    if (!eName.trim()) { toast.error("氏名を入力してください"); return; }
    let usernameChanged = false;
    if (linked) {
      const cur = profile?.username ?? "";
      const next = eUsername.trim();
      if (next !== cur) {
        const err = validateUsername(next);
        if (err) { toast.error(err); return; }
        usernameChanged = true;
      }
    }
    setSavingBasic(true);
    const { data, error } = await supabase.functions.invoke("admin-update-user", {
      body: {
        person_id: person.id,
        user_id: person.userId,
        display_name: eName.trim(),
        department: eDept,
        role_title: eRole.trim(),
        years_at_company: eYears,
        ...(usernameChanged ? { username: eUsername.trim() } : {}),
      },
    });
    setSavingBasic(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "更新に失敗しました"); return;
    }
    toast.success("更新しました");
    await onChanged();
  };

  const handleResetPassword = async () => {
    if (!person.userId) return;
    if (resetPw.length < 6) { toast.error("パスワードは6文字以上必要です"); return; }
    setResetting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "reset_password", user_id: person.userId, new_password: resetPw },
    });
    setResetting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "失敗しました"); return;
    }
    onRequestCredentialReveal({
      name: person.name, username: profile?.username ?? "", password: resetPw,
    });
    setResetPw(""); setResetReveal(false);
    await onChanged();
  };

  const handleToggleAdmin = async () => {
    if (!person.userId) return;
    setTogglingAdmin(true);
    const next = !isAdmin;
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "set_admin", user_id: person.userId, is_admin: next },
    });
    setTogglingAdmin(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || "失敗"); return; }
    toast.success(next ? "管理者権限を付与しました" : "管理者権限を解除しました");
    await onChanged();
  };

  const handleToggleActive = async () => {
    if (!person.userId) return;
    setTogglingActive(true);
    const next = !isActive;
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "set_active", user_id: person.userId, is_active: next },
    });
    setTogglingActive(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || "失敗"); return; }
    toast.success(next ? "有効化しました" : "無効化しました");
    await onChanged();
  };

  const handleDelete = async () => {
    setDeleting(true);
    if (person.userId) {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "delete", user_id: person.userId },
      });
      if (error || (data as any)?.error) {
        setDeleting(false);
        toast.error((data as any)?.error || "削除に失敗"); return;
      }
    }
    await deletePerson(person.id);
    setDeleting(false);
    toast.success(`${person.name} を削除しました`);
    setConfirmDelete(false);
    onOpenChange(false);
    await Promise.all([refreshPeople(), onChanged()]);
  };

  // Level progress
  const lv = stats?.level ?? 1;
  const xp = stats?.xp ?? 0;
  const xpForCurrent = LEVEL_THRESHOLDS[lv - 1] ?? 0;
  const xpForNext = LEVEL_THRESHOLDS[lv] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const xpInLevel = xp - xpForCurrent;
  const xpNeededInLevel = Math.max(1, xpForNext - xpForCurrent);
  const levelProgress = Math.min(100, Math.round((xpInLevel / xpNeededInLevel) * 100));
  const levelTitle = LEVEL_TITLES[Math.min(lv - 1, LEVEL_TITLES.length - 1)];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {person.name} の詳細管理
              {isAdmin && <Badge className="text-xs bg-primary/15 text-primary border-primary/30">管理者</Badge>}
              {!linked && <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">未紐付け</Badge>}
              {linked && !isActive && <Badge variant="outline" className="text-xs border-destructive text-destructive">無効</Badge>}
            </DialogTitle>
            <DialogDescription>
              基本情報の編集、パスワード再発行、権限・状態の変更、ゲーミフィケーション状況の確認、削除をここで行います。
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="password" disabled={!linked}>パスワード</TabsTrigger>
              <TabsTrigger value="role" disabled={!linked}>権限・状態</TabsTrigger>
              <TabsTrigger value="gamification" disabled={!linked}>活動状況</TabsTrigger>
              <TabsTrigger value="danger" className="text-destructive">削除</TabsTrigger>
            </TabsList>

            {/* Basic */}
            <TabsContent value="basic" className="space-y-4 pt-4">
              <div>
                <Label>表示名（氏名） <span className="text-destructive">*</span></Label>
                <Input value={eName} onChange={e => setEName(e.target.value)} className="mt-1" />
                <p className="text-[10px] text-muted-foreground mt-1">変更すると過去投稿の表示名スナップショットも更新します。</p>
              </div>
              {linked && (
                <div>
                  <Label>ログインID</Label>
                  <Input value={eUsername} onChange={e => setEUsername(e.target.value)} className="mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">3〜64文字 / 空白と @ は使えません。変更すると本人は新IDでログインする必要があります。</p>
                </div>
              )}
              <div>
                <Label>部門</Label>
                <Select value={eDept} onValueChange={setEDept}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="部門を選択" /></SelectTrigger>
                  <SelectContent>
                    {/* 既存の部門名がマスタに無い場合も表示できるよう先頭に追加 */}
                    {eDept && !departments.some(d => d.name === eDept) && (
                      <SelectItem value={eDept}>{eDept}（マスタ未登録）</SelectItem>
                    )}
                    {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
              <div className="flex justify-end">
                <Button onClick={handleSaveBasic} disabled={savingBasic}>
                  {savingBasic && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  保存
                </Button>
              </div>
            </TabsContent>

            {/* Password */}
            <TabsContent value="password" className="space-y-4 pt-4">
              <div className="rounded-lg border border-border p-3 bg-muted/30 text-xs text-muted-foreground">
                発行後の新しいパスワードは1度だけ画面に表示され、その後は二度と表示できません。
              </div>
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
              <div className="flex justify-end">
                <Button onClick={handleResetPassword} disabled={resetting}>
                  {resetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  再発行
                </Button>
              </div>
            </TabsContent>

            {/* Role & State */}
            <TabsContent value="role" className="space-y-4 pt-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    管理者権限
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    評価方針設定・提案者管理・管理者ダッシュボードへのアクセスを許可します。
                  </p>
                </div>
                <Switch
                  checked={isAdmin}
                  onCheckedChange={handleToggleAdmin}
                  disabled={isSelf || togglingAdmin}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">アカウント有効状態</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    無効にすると本人はログインできなくなります（データは保持）。
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={handleToggleActive}
                  disabled={isSelf || togglingActive}
                />
              </div>
              {isSelf && (
                <p className="text-xs text-amber-700">
                  自分自身の権限・状態は変更できません（ロックアウト防止）。
                </p>
              )}
            </TabsContent>

            {/* Gamification */}
            <TabsContent value="gamification" className="space-y-4 pt-4">
              {loadingStats ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : stats ? (
                <>
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">現在のレベル</p>
                        <p className="text-2xl font-bold">Lv.{lv} <span className="text-sm font-normal text-muted-foreground ml-1">{levelTitle}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">累計XP</p>
                        <p className="text-2xl font-bold text-primary">{xp}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>次のレベルまで</span>
                        <span>{xpInLevel} / {xpNeededInLevel} XP</span>
                      </div>
                      <Progress value={levelProgress} className="h-2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <StatBox icon={<FileText className="w-4 h-4" />} label="総投稿数" value={stats.totalSubmissions} />
                    <StatBox icon={<Flame className="w-4 h-4" />} label="連続活動日" value={`${stats.consecutiveDays}日`} />
                    <StatBox icon={<Heart className="w-4 h-4" />} label="獲得いいね" value={stats.likesReceived} />
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-primary" />
                        達成ミッション
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {stats.completedMissions.length} / {stats.totalMissions}
                      </span>
                    </div>
                    {stats.completedMissions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">まだ達成ミッションはありません。</p>
                    ) : (
                      <div className="space-y-1.5">
                        {stats.completedMissions.map((m, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{m.icon}</span>
                              <span className="text-sm">{m.title}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px]">+{m.xpReward} XP</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {stats.lastActiveDate && (
                    <p className="text-xs text-muted-foreground text-right">
                      最終活動日: {stats.lastActiveDate}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">活動データがありません。</p>
              )}
            </TabsContent>

            {/* Danger zone */}
            <TabsContent value="danger" className="space-y-4 pt-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4" />
                    アカウントを削除
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ログインアカウントと提案者情報を削除します。本人が投稿した改善案は削除時点の表示名で残ります。この操作は取り消せません。
                  </p>
                </div>
                <Button
                  variant="destructive"
                  disabled={isSelf}
                  onClick={() => setConfirmDelete(true)}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  この提案者を削除する
                </Button>
                {isSelf && (
                  <p className="text-xs text-amber-700">自分自身は削除できません。</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{person.name} を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              ログインアカウントと提案者情報を削除します。投稿した改善案は表示名スナップショットで残ります。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const StatBox = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="rounded-lg border border-border p-3">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
      {icon}{label}
    </div>
    <p className="text-lg font-bold">{value}</p>
  </div>
);

export default AccountDetailModal;
