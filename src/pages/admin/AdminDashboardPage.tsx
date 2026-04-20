import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useKaios, EXECUTION_STAGES, ExecutionStage, KaizenItem, StageHistoryEntry } from "@/contexts/KaiosContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Search, Clock, History as HistoryIcon, FileText, AlertTriangle, Save, Sparkles, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

const STAGE_COLORS: Record<ExecutionStage, string> = {
  "提案中": "bg-blue-500/10 text-blue-700 border-blue-200",
  "実行予定": "bg-amber-500/10 text-amber-700 border-amber-200",
  "実行済み": "bg-green-500/10 text-green-700 border-green-200",
};

const daysSince = (iso: string | null) => {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
};

const AdminDashboardPage = () => {
  const { kaizenItems, evalAxes, updateExecutionStage, updateAdminMemo, getStageHistory, getPersonById, refreshItems } = useKaios();
  const { signOut } = useAuth();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<ExecutionStage | "all">("all");
  const [memoOnly, setMemoOnly] = useState(false);
  const [detailItem, setDetailItem] = useState<KaizenItem | null>(null);
  const [history, setHistory] = useState<StageHistoryEntry[]>([]);
  const [memoDraft, setMemoDraft] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<ExecutionStage>("実行予定");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const filteredItems = useMemo(() => {
    return kaizenItems.filter(item => {
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
    });
  }, [kaizenItems, search, stageFilter, memoOnly]);

  const stats = useMemo(() => {
    const counts = { 提案中: 0, 実行予定: 0, 実行済み: 0 };
    let stagnant = 0;
    kaizenItems.forEach(item => {
      counts[item.executionStage] = (counts[item.executionStage] || 0) + 1;
      if (item.executionStage === "提案中") {
        const refDate = item.stageChangedAt || item.createdAt;
        if (daysSince(refDate) >= 30) stagnant++;
      }
    });
    return { ...counts, stagnant, total: kaizenItems.length };
  }, [kaizenItems]);

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every(i => selected.has(i.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      const next = new Set(selected);
      filteredItems.forEach(i => next.delete(i.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filteredItems.forEach(i => next.add(i.id));
      setSelected(next);
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const openDetail = async (item: KaizenItem) => {
    setDetailItem(item);
    setMemoDraft(item.adminMemo || "");
    const h = await getStageHistory(item.id);
    setHistory(h);
  };

  const handleStageChange = async (item: KaizenItem, newStage: ExecutionStage) => {
    if (newStage === item.executionStage) return;
    await updateExecutionStage(item.id, newStage);
    if (detailItem?.id === item.id) {
      const h = await getStageHistory(item.id);
      setHistory(h);
      setDetailItem({ ...item, executionStage: newStage });
    }
  };

  const handleBulkApply = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkApplying(true);
    let changed = 0;
    for (const id of ids) {
      const item = kaizenItems.find(i => i.id === id);
      if (!item || item.executionStage === bulkStage) continue;
      await updateExecutionStage(id, bulkStage);
      changed++;
    }
    setBulkApplying(false);
    setSelected(new Set());
    toast.success(`${changed}件の段階を「${bulkStage}」に変更しました`);
  };

  const handleSaveMemo = async () => {
    if (!detailItem) return;
    setSavingMemo(true);
    await updateAdminMemo(detailItem.id, memoDraft);
    setSavingMemo(false);
    toast.success("メモを保存しました");
    setDetailItem({ ...detailItem, adminMemo: memoDraft });
  };

  const handleRecalculate = async () => {
    if (!evalAxes || evalAxes.length === 0) {
      toast.error("評価軸が未設定です");
      return;
    }
    setRecalculating(true);
    const tid = toast.loading("AIが全件のインパクトを再計算中...");
    try {
      const { data, error } = await supabase.functions.invoke("recalculate-impact", {
        body: {
          axes: evalAxes
            .filter(a => a.isActive)
            .map(a => ({ key: a.key, name: a.name, weight: a.weight, description: a.description })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message || "再計算が完了しました", { id: tid });
      await refreshItems();
    } catch (e) {
      toast.error(`再計算に失敗: ${e instanceof Error ? e.message : "Unknown"}`, { id: tid });
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">管理者ダッシュボード</h1>
            <p className="text-xs text-muted-foreground mt-0.5">改善案の実行段階管理・メモ・AI再計算（集計の可視化はインパクト分析へ）</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating}>
              {recalculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
              AIスコア再計算
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/eval-settings"><Sparkles className="w-4 h-4 mr-2" />評価方針設定</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); toast.success("ログアウトしました"); }}>
              <LogOut className="w-4 h-4 mr-2" />ログアウト
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="提案中" value={stats["提案中"]} color="text-blue-600" />
          <KpiCard label="実行予定" value={stats["実行予定"]} color="text-amber-600" />
          <KpiCard label="実行済み" value={stats["実行済み"]} color="text-green-600" />
          <KpiCard
            label="滞留(30日以上)"
            value={stats.stagnant}
            color={stats.stagnant > 0 ? "text-destructive" : "text-muted-foreground"}
            icon={stats.stagnant > 0 ? <AlertTriangle className="w-4 h-4 text-destructive" /> : undefined}
          />
        </div>



        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="タイトル・課題・部門・メモで検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as any)}>
              <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての段階</SelectItem>
                {EXECUTION_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none whitespace-nowrap">
              <Checkbox checked={memoOnly} onCheckedChange={(v) => setMemoOnly(!!v)} />
              <FileText className="w-4 h-4" />メモあり
            </label>
          </CardContent>
        </Card>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-3 flex flex-col md:flex-row gap-3 md:items-center justify-between">
              <p className="text-sm font-medium text-foreground">{selected.size} 件を選択中</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">→</span>
                <Select value={bulkStage} onValueChange={(v) => setBulkStage(v as ExecutionStage)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXECUTION_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleBulkApply} disabled={bulkApplying}>
                  {bulkApplying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  一括変更
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>解除</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items list */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">改善案一覧 ({filteredItems.length}件)</CardTitle>
            {filteredItems.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} />全選択
              </label>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {filteredItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">該当する改善案がありません</p>
            ) : (
              <div className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const refDate = item.stageChangedAt || item.createdAt;
                  const days = daysSince(refDate);
                  const isStagnant = item.executionStage === "提案中" && days >= 30;
                  const author = getPersonById(item.authorId);
                  return (
                    <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selected.has(item.id)}
                          onCheckedChange={() => toggleOne(item.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 flex items-start justify-between gap-4 min-w-0">
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openDetail(item)}>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-medium text-foreground">{item.title}</h3>
                              <Badge variant="outline" className={STAGE_COLORS[item.executionStage]}>
                                {item.executionStage}
                              </Badge>
                              {isStagnant && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />滞留 {days}日
                                </Badge>
                              )}
                              {item.adminMemo && (
                                <Badge variant="secondary" className="text-xs">
                                  <FileText className="w-3 h-3 mr-1" />メモあり
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">{item.problem}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                              <span>{item.department}</span>
                              <span>•</span>
                              <span>{author?.name || "不明"}</span>
                              <span>•</span>
                              <span>インパクト {item.impactScore}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.stageChangedAt ? `段階変更: ${days}日前` : `作成: ${days}日前`}
                              </span>
                            </div>
                          </div>
                          <Select
                            value={item.executionStage}
                            onValueChange={(v) => handleStageChange(item, v as ExecutionStage)}
                          >
                            <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {EXECUTION_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle>{detailItem.title}</DialogTitle>
                <DialogDescription>
                  {detailItem.department} • インパクト {detailItem.impactScore}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Section label="課題">{detailItem.problem}</Section>
                <Section label="原因">{detailItem.cause}</Section>
                <Section label="解決策">{detailItem.solution}</Section>
                <Section label="効果">{detailItem.effect}</Section>

                {/* Memo */}
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

                {/* History */}
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
    </div>
  );
};

const KpiCard = ({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </CardContent>
  </Card>
);

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
    <p className="text-sm text-foreground whitespace-pre-wrap">{children}</p>
  </div>
);

export default AdminDashboardPage;
