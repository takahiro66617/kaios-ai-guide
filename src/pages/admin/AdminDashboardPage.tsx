import { useState, useMemo, useEffect } from "react";
import { useKaios, EXECUTION_STAGES, ExecutionStage, KaizenItem, StageHistoryEntry } from "@/contexts/KaiosContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LogOut, Search, Clock, History as HistoryIcon, FileText, AlertTriangle, Save, Loader2,
  Building2, Inbox, TrendingUp, Workflow, Share2, Check, X, ShieldAlert, Users, Award,
} from "lucide-react";
import { toast } from "sonner";
import DepartmentMasterModal from "@/components/admin/DepartmentMasterModal";

const STAGE_COLORS: Record<ExecutionStage, string> = {
  "提案中": "bg-blue-500/10 text-blue-700 border-blue-200",
  "実行予定": "bg-amber-500/10 text-amber-700 border-amber-200",
  "実行済み": "bg-green-500/10 text-green-700 border-green-200",
};

const RISK_KEYWORDS = ["リスク", "事故", "コンプラ", "重大", "安全"];

const daysSince = (iso: string | null) => {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
};

const AdminDashboardPage = () => {
  const {
    kaizenItems, updateExecutionStage, updateAdminMemo, getStageHistory, getPersonById,
    approveKaizen, rejectKaizen,
  } = useKaios();
  const { signOut } = useAuth();

  const [detailItem, setDetailItem] = useState<KaizenItem | null>(null);
  const [history, setHistory] = useState<StageHistoryEntry[]>([]);
  const [memoDraft, setMemoDraft] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);

  const pendingItems = useMemo(
    () => kaizenItems.filter(i => i.status === "申請中"),
    [kaizenItems],
  );
  const approvedItems = useMemo(
    () => kaizenItems.filter(i => i.status === "承認済み"),
    [kaizenItems],
  );

  const openDetail = async (item: KaizenItem) => {
    setDetailItem(item);
    setMemoDraft(item.adminMemo || "");
    const h = await getStageHistory(item.id);
    setHistory(h);
  };

  const handleSaveMemo = async () => {
    if (!detailItem) return;
    setSavingMemo(true);
    await updateAdminMemo(detailItem.id, memoDraft);
    setSavingMemo(false);
    toast.success("メモを保存しました");
    setDetailItem({ ...detailItem, adminMemo: memoDraft });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">管理者ダッシュボード</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              役職別の意思決定ビュー（収益インパクト / 実行・案件化 / 展開・資産化）と承認レビュー枠を提供します。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeptModalOpen(true)}>
              <Building2 className="w-4 h-4 mr-2" />部門マスタ管理
            </Button>
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); toast.success("ログアウトしました"); }}>
              <LogOut className="w-4 h-4 mr-2" />ログアウト
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue={pendingItems.length > 0 ? "review" : "execution"}>
          <TabsList className="grid grid-cols-4 w-full max-w-3xl">
            <TabsTrigger value="review" className="gap-2">
              <Inbox className="w-4 h-4" />申請レビュー
              {pendingItems.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{pendingItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="impact" className="gap-2"><TrendingUp className="w-4 h-4" />収益インパクト</TabsTrigger>
            <TabsTrigger value="execution" className="gap-2"><Workflow className="w-4 h-4" />実行・案件化</TabsTrigger>
            <TabsTrigger value="scaling" className="gap-2"><Share2 className="w-4 h-4" />展開・資産化</TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="mt-6">
            <ReviewView items={pendingItems} onApprove={approveKaizen} onReject={rejectKaizen} onOpen={openDetail} getPersonById={getPersonById} />
          </TabsContent>

          <TabsContent value="impact" className="mt-6">
            <ImpactCandidateView items={approvedItems} onOpen={openDetail} getPersonById={getPersonById} />
          </TabsContent>

          <TabsContent value="execution" className="mt-6">
            <ExecutionView
              items={approvedItems}
              onOpen={openDetail}
              onStageChange={updateExecutionStage}
              onMemoSave={updateAdminMemo}
              getPersonById={getPersonById}
            />
          </TabsContent>

          <TabsContent value="scaling" className="mt-6">
            <ScalingView items={approvedItems} onOpen={openDetail} onMemoSave={updateAdminMemo} getPersonById={getPersonById} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail dialog (shared) */}
      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle>{detailItem.title}</DialogTitle>
                <DialogDescription>
                  {detailItem.department} • インパクト {detailItem.impactScore} •
                  <Badge variant="outline" className="ml-2">{detailItem.status}</Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Section label="課題">{detailItem.problem}</Section>
                <Section label="原因">{detailItem.cause}</Section>
                <Section label="解決策">{detailItem.solution}</Section>
                <Section label="効果">{detailItem.effect}</Section>
                {detailItem.authorNote && (
                  <Section label="提案者メモ">{detailItem.authorNote}</Section>
                )}

                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" />管理者メモ（経営層向け・現場非公開）
                  </label>
                  <Textarea
                    value={memoDraft}
                    onChange={(e) => setMemoDraft(e.target.value)}
                    placeholder="この改善案に関する判断・指示・経緯などを記録"
                    rows={3}
                  />
                  <Button size="sm" className="mt-2" onClick={handleSaveMemo} disabled={savingMemo}>
                    <Save className="w-4 h-4 mr-2" />{savingMemo ? "保存中..." : "メモを保存"}
                  </Button>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                    <HistoryIcon className="w-4 h-4" />ステージ変更履歴
                  </h4>
                  {history.length === 0 ? (
                    <p className="text-xs text-muted-foreground">まだ変更履歴はありません</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {history.map(h => (
                        <li key={h.id} className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="text-foreground">
                            {h.fromStage ? `${h.fromStage} → ` : ""}{h.toStage}
                          </span>
                          <span>by {h.changedBy}</span>
                          <span>•</span>
                          <span>{new Date(h.createdAt).toLocaleString("ja-JP")}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <DepartmentMasterModal open={deptModalOpen} onOpenChange={setDeptModalOpen} />
    </div>
  );
};

/* ============== Review View (申請中) ============== */
const ReviewView = ({
  items, onApprove, onReject, onOpen, getPersonById,
}: {
  items: KaizenItem[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
  onOpen: (item: KaizenItem) => void;
  getPersonById: (id: string) => any;
}) => {
  const [rejectTarget, setRejectTarget] = useState<KaizenItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
          現在レビュー待ちの申請はありません
        </CardContent>
      </Card>
    );
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">申請中レビュー ({items.length}件)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {items.map(item => {
            const author = getPersonById(item.authorId);
            return (
              <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpen(item)}>
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.problem}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span>{item.department}</span><span>•</span>
                      <span>{author?.name || item.authorNameSnapshot || "不明"}</span><span>•</span>
                      <span>インパクト {item.impactScore}</span><span>•</span>
                      <span>{daysSince(item.createdAt)}日前</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" onClick={() => onApprove(item.id).then(() => toast.success("承認しました"))}>
                      <Check className="w-4 h-4 mr-1" />承認
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setRejectTarget(item); setRejectReason(""); }}>
                      <X className="w-4 h-4 mr-1" />差戻し
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>差戻し理由</DialogTitle>
            <DialogDescription>提案者へ修正依頼を伝えるためのコメントを入力してください。</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} placeholder="例: 効果の数値根拠が不足しています" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={async () => {
              if (!rejectTarget) return;
              await onReject(rejectTarget.id, rejectReason.trim() || undefined);
              toast.success("差戻しました");
              setRejectTarget(null);
            }}>差戻す</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/* ============== ① Impact Candidate View ============== */
const ImpactCandidateView = ({ items, onOpen, getPersonById }: {
  items: KaizenItem[]; onOpen: (item: KaizenItem) => void; getPersonById: (id: string) => any;
}) => {
  const treasures = useMemo(
    () => items.filter(i => i.impactScore >= 80 && i.executionStage === "提案中").sort((a, b) => b.impactScore - a.impactScore),
    [items],
  );
  const risks = useMemo(
    () => items.filter(i => i.tags.some(t => RISK_KEYWORDS.some(k => t.includes(k)))).sort((a, b) => b.impactScore - a.impactScore),
    [items],
  );
  const cross = useMemo(
    () => items.filter(i => i.adoptedBy.length >= 2).sort((a, b) => b.adoptedBy.length - a.adoptedBy.length),
    [items],
  );

  return (
    <div className="space-y-6">
      <SectionGroup title="お宝改善（インパクト 80+ かつ 提案中）" icon={<Award className="w-4 h-4 text-amber-600" />} items={treasures} onOpen={onOpen} getPersonById={getPersonById} emptyText="該当なし" />
      <SectionGroup title="重大リスク案件" icon={<ShieldAlert className="w-4 h-4 text-destructive" />} items={risks} onOpen={onOpen} getPersonById={getPersonById} emptyText="リスク関連タグ付きの案件はありません" />
      <SectionGroup title="横断案件（複数部署が採用）" icon={<Users className="w-4 h-4 text-primary" />} items={cross} onOpen={onOpen} getPersonById={getPersonById} emptyText="複数部署採用の案件はまだありません" />
    </div>
  );
};

/* ============== ② Execution View ============== */
const ExecutionView = ({
  items, onOpen, onStageChange, onMemoSave, getPersonById,
}: {
  items: KaizenItem[];
  onOpen: (item: KaizenItem) => void;
  onStageChange: (id: string, stage: ExecutionStage) => Promise<void>;
  onMemoSave: (id: string, memo: string) => Promise<void>;
  getPersonById: (id: string) => any;
}) => {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<ExecutionStage | "all">("all");
  const [memoOnly, setMemoOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<ExecutionStage>("実行予定");
  const [bulkApplying, setBulkApplying] = useState(false);

  const filtered = useMemo(() => items.filter(item => {
    if (stageFilter !== "all" && item.executionStage !== stageFilter) return false;
    if (memoOnly && !item.adminMemo?.trim()) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.problem.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        (item.adminMemo || "").toLowerCase().includes(q)
      );
    }
    return true;
  }), [items, search, stageFilter, memoOnly]);

  const stats = useMemo(() => {
    const counts = { 提案中: 0, 実行予定: 0, 実行済み: 0 };
    let stagnant = 0;
    items.forEach(i => {
      counts[i.executionStage]++;
      if (i.executionStage === "提案中" && daysSince(i.stageChangedAt || i.createdAt) >= 30) stagnant++;
    });
    return { ...counts, stagnant };
  }, [items]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(i => selected.has(i.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allFilteredSelected) filtered.forEach(i => next.delete(i.id));
    else filtered.forEach(i => next.add(i.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const handleBulk = async () => {
    setBulkApplying(true);
    let n = 0;
    for (const id of Array.from(selected)) {
      const item = items.find(i => i.id === id);
      if (!item || item.executionStage === bulkStage) continue;
      await onStageChange(id, bulkStage);
      n++;
    }
    setBulkApplying(false);
    setSelected(new Set());
    toast.success(`${n}件の段階を「${bulkStage}」に変更しました`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="提案中" value={stats["提案中"]} color="text-blue-600" />
        <KpiCard label="実行予定" value={stats["実行予定"]} color="text-amber-600" />
        <KpiCard label="実行済み" value={stats["実行済み"]} color="text-green-600" />
        <KpiCard label="滞留(30日+)" value={stats.stagnant} color={stats.stagnant > 0 ? "text-destructive" : "text-muted-foreground"} icon={stats.stagnant > 0 ? <AlertTriangle className="w-4 h-4 text-destructive" /> : undefined} />
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="タイトル・課題・部門・メモで検索" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as any)}>
            <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての段階</SelectItem>
              {EXECUTION_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none whitespace-nowrap">
            <Checkbox checked={memoOnly} onCheckedChange={(v) => setMemoOnly(!!v)} />
            <FileText className="w-4 h-4" />メモあり
          </label>
        </CardContent>
      </Card>

      {selected.size > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-3 flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <p className="text-sm font-medium">{selected.size} 件を選択中</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">→</span>
              <Select value={bulkStage} onValueChange={(v) => setBulkStage(v as ExecutionStage)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{EXECUTION_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" onClick={handleBulk} disabled={bulkApplying}>
                {bulkApplying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}一括変更
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>解除</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">承認済み案件 ({filtered.length}件)</CardTitle>
          {filtered.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} />全選択
            </label>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">該当する改善案がありません</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(item => (
                <ExecutionRow key={item.id}
                  item={item}
                  selected={selected.has(item.id)}
                  onToggle={() => toggleOne(item.id)}
                  onOpen={() => onOpen(item)}
                  onStageChange={(s) => onStageChange(item.id, s)}
                  onMemoSave={(m) => onMemoSave(item.id, m)}
                  author={getPersonById(item.authorId)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const ExecutionRow = ({
  item, selected, onToggle, onOpen, onStageChange, onMemoSave, author,
}: {
  item: KaizenItem; selected: boolean; onToggle: () => void; onOpen: () => void;
  onStageChange: (s: ExecutionStage) => Promise<void>;
  onMemoSave: (m: string) => Promise<void>;
  author: any;
}) => {
  const [memo, setMemo] = useState(item.adminMemo || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setMemo(item.adminMemo || ""); }, [item.adminMemo]);
  const refDate = item.stageChangedAt || item.createdAt;
  const days = daysSince(refDate);
  const isStagnant = item.executionStage === "提案中" && days >= 30;
  const dirty = memo !== (item.adminMemo || "");

  return (
    <div className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-medium text-foreground">{item.title}</h3>
                <Badge variant="outline" className={STAGE_COLORS[item.executionStage]}>{item.executionStage}</Badge>
                {isStagnant && <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />滞留 {days}日</Badge>}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">{item.problem}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                <span>{item.department}</span><span>•</span>
                <span>{author?.name || item.authorNameSnapshot || "不明"}</span><span>•</span>
                <span>インパクト {item.impactScore}</span><span>•</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.stageChangedAt ? `段階変更: ${days}日前` : `作成: ${days}日前`}</span>
              </div>
            </div>
            <Select value={item.executionStage} onValueChange={(v) => onStageChange(v as ExecutionStage)}>
              <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>{EXECUTION_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="mt-3 flex items-start gap-2">
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="管理者メモ（現場非公開・経営層共有用）"
              rows={1}
              className="text-xs min-h-[2.25rem]"
            />
            <Button
              size="sm"
              variant={dirty ? "default" : "outline"}
              disabled={!dirty || saving}
              onClick={async () => { setSaving(true); await onMemoSave(memo); setSaving(false); toast.success("メモを保存しました"); }}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============== ③ Scaling View ============== */
const ScalingView = ({ items, onOpen, onMemoSave, getPersonById }: {
  items: KaizenItem[]; onOpen: (item: KaizenItem) => void;
  onMemoSave: (id: string, memo: string) => Promise<void>;
  getPersonById: (id: string) => any;
}) => {
  const horizontal = useMemo(
    () => items.filter(i => i.executionStage === "実行済み" && i.reproducibility === "高"),
    [items],
  );
  const standardize = useMemo(() => {
    const grouped = new Map<string, KaizenItem[]>();
    items.filter(i => i.executionStage === "実行済み").forEach(i => {
      const arr = grouped.get(i.category) || [];
      arr.push(i); grouped.set(i.category, arr);
    });
    return Array.from(grouped.entries()).filter(([, arr]) => arr.length >= 3);
  }, [items]);
  const institutionalize = useMemo(
    () => items.filter(i => i.executionStage === "実行済み" && i.adoptedBy.length >= 3),
    [items],
  );

  return (
    <div className="space-y-6">
      <SectionGroup title="横展開候補（実行済み × 再現性 高）" icon={<Share2 className="w-4 h-4 text-primary" />} items={horizontal} onOpen={onOpen} getPersonById={getPersonById} emptyText="該当なし" withMemo onMemoSave={onMemoSave} />

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Workflow className="w-4 h-4" />標準化候補（同一カテゴリで実行済み3件以上）</CardTitle></CardHeader>
        <CardContent className="p-0">
          {standardize.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">標準化候補となるカテゴリはまだありません</p>
          ) : (
            <ul className="divide-y divide-border">
              {standardize.map(([cat, arr]) => (
                <li key={cat} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{cat}</p>
                      <p className="text-xs text-muted-foreground mt-1">実行済み {arr.length}件 / 平均インパクト {Math.round(arr.reduce((s, i) => s + i.impactScore, 0) / arr.length)}</p>
                    </div>
                    <Badge variant="secondary">{arr.length}件</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <SectionGroup title="制度化候補（複数部署が採用済 × 実行済み）" icon={<Award className="w-4 h-4 text-amber-600" />} items={institutionalize} onOpen={onOpen} getPersonById={getPersonById} emptyText="該当なし" withMemo onMemoSave={onMemoSave} />
    </div>
  );
};

/* ============== Shared atoms ============== */
const SectionGroup = ({
  title, icon, items, onOpen, getPersonById, emptyText, withMemo, onMemoSave,
}: {
  title: string; icon: React.ReactNode; items: KaizenItem[];
  onOpen: (item: KaizenItem) => void; getPersonById: (id: string) => any;
  emptyText: string; withMemo?: boolean;
  onMemoSave?: (id: string, memo: string) => Promise<void>;
}) => (
  <Card>
    <CardHeader><CardTitle className="text-base flex items-center gap-2">{icon}{title}<span className="text-xs text-muted-foreground font-normal">({items.length})</span></CardTitle></CardHeader>
    <CardContent className="p-0">
      {items.length === 0 ? (
        <p className="text-center text-muted-foreground py-6 text-sm">{emptyText}</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map(item => {
            const author = getPersonById(item.authorId);
            return (
              <div key={item.id} className="p-4 hover:bg-muted/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpen(item)}>
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{item.problem}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                      <span>{item.department}</span><span>•</span>
                      <span>{author?.name || item.authorNameSnapshot || "不明"}</span><span>•</span>
                      <span>インパクト {item.impactScore}</span>
                      {item.adoptedBy.length > 0 && (<><span>•</span><span>採用 {item.adoptedBy.length}部署</span></>)}
                    </div>
                  </div>
                  <Badge variant="outline" className={STAGE_COLORS[item.executionStage]}>{item.executionStage}</Badge>
                </div>
                {withMemo && onMemoSave && (
                  <ScalingMemoRow item={item} onMemoSave={onMemoSave} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);

const ScalingMemoRow = ({ item, onMemoSave }: { item: KaizenItem; onMemoSave: (id: string, memo: string) => Promise<void>; }) => {
  const [memo, setMemo] = useState(item.adminMemo || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setMemo(item.adminMemo || ""); }, [item.adminMemo]);
  const dirty = memo !== (item.adminMemo || "");
  return (
    <div className="mt-3 flex items-start gap-2">
      <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="横展開メモ（標準化方針・展開先候補など）" rows={1} className="text-xs min-h-[2.25rem]" />
      <Button size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty || saving}
        onClick={async () => { setSaving(true); await onMemoSave(item.id, memo); setSaving(false); toast.success("メモを保存しました"); }}>
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
      </Button>
    </div>
  );
};

const KpiCard = ({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) => (
  <Card><CardContent className="p-4">
    <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{label}</p>{icon}</div>
    <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
  </CardContent></Card>
);

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
    <p className="text-sm text-foreground whitespace-pre-wrap">{children}</p>
  </div>
);

export default AdminDashboardPage;
