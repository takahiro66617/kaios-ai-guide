import { useState, useMemo } from "react";
import { useKaios, EXECUTION_STAGES, ExecutionStage, KaizenItem, StageHistoryEntry } from "@/contexts/KaiosContext";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Search, Clock, History as HistoryIcon, FileText, AlertTriangle, Save } from "lucide-react";
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
  const { kaizenItems, updateExecutionStage, updateAdminMemo, getStageHistory, getPersonById } = useKaios();
  const { logout } = useAdminAuth();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<ExecutionStage | "all">("all");
  const [detailItem, setDetailItem] = useState<KaizenItem | null>(null);
  const [history, setHistory] = useState<StageHistoryEntry[]>([]);
  const [memoDraft, setMemoDraft] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);

  const filteredItems = useMemo(() => {
    return kaizenItems.filter(item => {
      if (stageFilter !== "all" && item.executionStage !== stageFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.problem.toLowerCase().includes(q) ||
          item.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [kaizenItems, search, stageFilter]);

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
            <p className="text-xs text-muted-foreground mt-0.5">経営層・管理者向けの実行管理画面</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { logout(); toast.success("ログアウトしました"); }}>
            <LogOut className="w-4 h-4 mr-2" />ログアウト
          </Button>
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
          <CardContent className="p-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="タイトル・課題・部門で検索"
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
          </CardContent>
        </Card>

        {/* Items list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">改善案一覧 ({filteredItems.length}件)</CardTitle>
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
                      <div className="flex items-start justify-between gap-4">
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
