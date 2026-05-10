import { useState, useEffect, useCallback } from "react";
import { Save, AlertTriangle, History, Info, Sparkles, CheckCircle2, Loader2, Lock, ChevronDown, Wand2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKaios } from "@/contexts/KaiosContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─── 固定軸の定義（変更不可・全社共通） ───────────────────────────
const FIXED_AXES = [
  {
    key: "essence",
    name: "本質性",
    description: "表面的な現象対応ではなく、重要な問題や原因に触れているか。",
    detail: "・問題設定の明確さ\n・原因仮説の深さ\n・構造的課題への接触",
    points: 20,
  },
  {
    key: "profitability",
    name: "収益寄与性",
    description: "売上増加・コスト削減など、事業価値につながるか。",
    detail: "・期待効果の明確さ\n・影響範囲の大きさ\n・経営価値との関連性",
    points: 20,
  },
  {
    key: "feasibility",
    name: "実現性",
    description: "現実の業務の中で実行可能であるか。",
    detail: "・内容の具体性\n・実施主体の明確さ\n・業務運用への落とし込み",
    points: 20,
  },
] as const;

// ─── 戦略軸の選択肢（7種類） ───────────────────────────────────────
const STRATEGIC_OPTIONS = [
  { key: "strategy_cost",         name: "原価低減",   description: "直接コストの削減・効率化" },
  { key: "strategy_productivity", name: "生産性向上", description: "工数・作業時間の削減" },
  { key: "strategy_quality",      name: "品質向上",   description: "不良率・クレームの低減" },
  { key: "strategy_sales",        name: "売上成長",   description: "顧客獲得・単価向上" },
  { key: "strategy_risk",         name: "リスク低減", description: "事故・コンプラリスクの排除" },
  { key: "strategy_speed",        name: "スピード",   description: "意思決定・実行速度の向上" },
  { key: "strategy_dx",           name: "DX推進",     description: "デジタル化・自動化の推進" },
];

// ─── 文化軸の選択肢（7種類） ───────────────────────────────────────
const CULTURAL_OPTIONS = [
  { key: "culture_safety",       name: "心理的安全性", description: "発言・挑戦しやすい職場風土" },
  { key: "culture_cross",        name: "部門横断",     description: "部署をまたいだ連携・横展開" },
  { key: "culture_ownership",    name: "当事者意識",   description: "個人の主体性・オーナーシップ" },
  { key: "culture_learning",     name: "学習文化",     description: "失敗から学ぶ・知識共有" },
  { key: "culture_customer",     name: "顧客起点",     description: "顧客視点での改善・価値提供" },
  { key: "culture_diversity",    name: "多様性",       description: "多様なバックグラウンドの活用" },
  { key: "culture_sustainability",name: "サステナ",    description: "環境・社会的責任への配慮" },
];

const STRATEGIC_KEYS = new Set(STRATEGIC_OPTIONS.map(o => o.key));
const CULTURAL_KEYS  = new Set(CULTURAL_OPTIONS.map(o => o.key));

const EvaluationSettings = () => {
  const { evalAxes, refreshEvalAxes, refreshItems } = useKaios();
  const { isAdmin } = useAuth();
  const readOnly = !isAdmin;

  const [selectedStrategic, setSelectedStrategic] = useState<string>("");
  const [selectedCultural,  setSelectedCultural]  = useState<string>("");
  const [savedStrategic,    setSavedStrategic]    = useState<string>("");
  const [savedCultural,     setSavedCultural]     = useState<string>("");
  const [isSaving,          setIsSaving]          = useState(false);
  const [isRecalculating,   setIsRecalculating]   = useState(false);
  const [history,           setHistory]           = useState<any[]>([]);

  // evalAxes から現在の選択を読み込む
  useEffect(() => {
    const strategic = evalAxes.find(a => STRATEGIC_KEYS.has(a.key));
    const cultural  = evalAxes.find(a => CULTURAL_KEYS.has(a.key));
    const sKey = strategic?.key ?? "";
    const cKey = cultural?.key  ?? "";
    setSelectedStrategic(sKey);
    setSelectedCultural(cKey);
    setSavedStrategic(sKey);
    setSavedCultural(cKey);
  }, [evalAxes]);

  const fetchHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from("eval_settings_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) setHistory(data as any[]);
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const hasChanges =
    selectedStrategic !== savedStrategic ||
    selectedCultural  !== savedCultural;

  // 選択軸を DB に保存（upsert）
  const upsertCustomAxis = async (
    currentKey: string,
    newKey: string,
    options: typeof STRATEGIC_OPTIONS,
    sortOrder: number,
  ) => {
    const chosen = options.find(o => o.key === newKey);
    if (!chosen) return;

    // 既存の同種レコードを削除
    if (currentKey && currentKey !== newKey) {
      await supabase.from("eval_axes").delete().eq("key", currentKey);
    }

    // 既に同じキーがあれば更新、なければ挿入
    const existing = evalAxes.find(a => a.key === newKey);
    if (existing) {
      await supabase.from("eval_axes").update({
        name: chosen.name,
        description: chosen.description,
        weight: 20,
        is_active: true,
      }).eq("id", existing.id);
    } else {
      await supabase.from("eval_axes").insert({
        name: chosen.name,
        key: chosen.key,
        description: chosen.description,
        tooltip: chosen.description,
        weight: 20,
        default_value: 20,
        sort_order: sortOrder,
        left_label: "低 (0%)",
        right_label: "高 (100%)",
      });
    }
  };

  // 固定3軸を DB に確実に存在させる
  const ensureFixedAxes = async () => {
    for (let i = 0; i < FIXED_AXES.length; i++) {
      const axis = FIXED_AXES[i];
      const existing = evalAxes.find(a => a.key === axis.key);
      if (!existing) {
        await supabase.from("eval_axes").insert({
          name: axis.name,
          key: axis.key,
          description: axis.description,
          tooltip: axis.description,
          weight: 20,
          default_value: 20,
          sort_order: i + 1,
          left_label: "低 (0%)",
          right_label: "高 (100%)",
        });
      } else if (existing.weight !== 20) {
        await supabase.from("eval_axes").update({ weight: 20, is_active: true }).eq("id", existing.id);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedStrategic) { toast.error("戦略軸を選択してください"); return; }
    if (!selectedCultural)  { toast.error("文化軸を選択してください");   return; }

    setIsSaving(true);
    try {
      await ensureFixedAxes();
      await upsertCustomAxis(savedStrategic, selectedStrategic, STRATEGIC_OPTIONS, 4);
      await upsertCustomAxis(savedCultural,  selectedCultural,  CULTURAL_OPTIONS,  5);

      // AI スコア再計算
      const allAxes = [
        ...FIXED_AXES.map(a => ({ key: a.key, name: a.name, description: a.description, weight: 20 })),
        { ...STRATEGIC_OPTIONS.find(o => o.key === selectedStrategic)!, weight: 20 },
        { ...CULTURAL_OPTIONS.find(o  => o.key === selectedCultural)!,  weight: 20 },
      ];
      const { data, error } = await supabase.functions.invoke("recalculate-impact", {
        body: { axes: allAxes },
      });
      if (error) { toast.error("AIスコア再計算に失敗しました"); return; }

      // 履歴保存
      await supabase.from("eval_settings_history").insert({
        speed: 20,
        cross_functional: 20,
        reproducibility_weight: 20,
        cost_efficiency: 20,
        innovation: 20,
        updated_by: "管理者",
      } as any);

      setSavedStrategic(selectedStrategic);
      setSavedCultural(selectedCultural);
      await Promise.all([refreshItems(), refreshEvalAxes(), fetchHistory()]);

      toast.success("評価軸を保存し、AIでスコアを再計算しました", {
        description: `${(data as any)?.updated ?? 0}件の改善案のスコアが更新されました`,
      });
    } catch (e) {
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    const tid = toast.loading("AIが全件のインパクトを再計算中...");
    try {
      const s = STRATEGIC_OPTIONS.find(o => o.key === savedStrategic);
      const c = CULTURAL_OPTIONS.find(o => o.key === savedCultural);
      const axes = [
        ...FIXED_AXES.map(a => ({ key: a.key, name: a.name, description: a.description, weight: 20 })),
        ...(s ? [{ ...s, weight: 20 }] : []),
        ...(c ? [{ ...c, weight: 20 }] : []),
      ];
      const { data, error } = await supabase.functions.invoke("recalculate-impact", { body: { axes } });
      if (error) throw error;
      await refreshItems();
      toast.success("全件のAIスコアを再計算しました", {
        id: tid,
        description: `${(data as any)?.updated ?? 0}件の改善案を更新しました`,
      });
    } catch (e) {
      toast.error("再計算に失敗しました", { id: tid });
    } finally {
      setIsRecalculating(false);
    }
  };

  const strategicLabel = STRATEGIC_OPTIONS.find(o => o.key === selectedStrategic)?.name ?? "未選択";
  const culturalLabel  = CULTURAL_OPTIONS.find(o  => o.key === selectedCultural)?.name  ?? "未選択";

  return (
    <TooltipProvider delayDuration={150}>
      <main className="flex-1 bg-kaios-surface overflow-auto">
        <div className="p-4 sm:p-6 max-w-[1200px] mx-auto space-y-6">

          {/* ── ヘッダー ── */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">評価方針設定</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                固定3軸（60点）は全社共通です。会社の方針に合わせて戦略軸・文化軸を1つずつ選んでください。
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <History className="w-4 h-4" />変更履歴
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>変更履歴</DialogTitle></DialogHeader>
                  <div className="space-y-3 mt-2 max-h-[400px] overflow-auto">
                    {history.length > 0 ? history.map((entry: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{entry.updated_by || "管理者"}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString("ja-JP")}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground text-center py-4">変更履歴はまだありません</p>
                    )}
                  </div>
                  <DialogFooter><DialogClose asChild><Button variant="outline">閉じる</Button></DialogClose></DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={readOnly || isRecalculating || isSaving}>
                    {isRecalculating
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Wand2 className="w-4 h-4" />}
                    AIスコア再計算
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>全件のAIスコアを再計算しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      現在保存されている評価軸に基づいて、すべての改善案のスコアをAIが再計算します。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRecalculate}>再計算する</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleSave}
                disabled={readOnly || !hasChanges || isSaving || isRecalculating}
              >
                {isSaving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Save className="w-4 h-4" />}
                {isSaving ? "保存中..." : "設定を保存"}
              </Button>
            </div>
          </div>

          {readOnly && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              マネージャー権限では評価方針の<strong>閲覧のみ</strong>可能です。変更は管理者にご依頼ください。
            </div>
          )}

          {/* ── 配分バナー ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">固定評価軸</p>
              <p className="text-3xl font-black text-primary">60<span className="text-lg">点</span></p>
              <p className="text-xs text-muted-foreground mt-1">3軸 × 各20点・変更不可</p>
            </div>
            <div className="rounded-xl border-2 border-amber-400/40 bg-amber-50/50 p-4 text-center">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">選択戦略軸</p>
              <p className="text-3xl font-black text-amber-600">20<span className="text-lg">点</span></p>
              <p className="text-xs text-muted-foreground mt-1">7種類から1つ選択</p>
            </div>
            <div className="rounded-xl border-2 border-emerald-400/40 bg-emerald-50/50 p-4 text-center">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">選択文化軸</p>
              <p className="text-3xl font-black text-emerald-600">20<span className="text-lg">点</span></p>
              <p className="text-xs text-muted-foreground mt-1">7種類から1つ選択</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ── 左カラム：軸設定 ── */}
            <div className="lg:col-span-7 space-y-4">

              {/* 固定3軸 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    固定評価軸（60点・変更不可）
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    全社共通の基準です。削除・変更はできません。
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {FIXED_AXES.map(axis => (
                    <div key={axis.key} className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{axis.name}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[220px]">
                              <p className="text-xs whitespace-pre-wrap">{axis.detail}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{axis.description}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-lg font-black text-primary">20</span>
                        <span className="text-xs text-muted-foreground">点</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 戦略軸 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="w-4 h-4 text-amber-600">⚡</span>
                    選択戦略軸（20点）
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    今期の会社の方向性に合わせて1つ選んでください。
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={selectedStrategic} onValueChange={setSelectedStrategic} disabled={readOnly}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="戦略軸を選んでください" />
                    </SelectTrigger>
                    <SelectContent>
                      {STRATEGIC_OPTIONS.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>
                          <div>
                            <span className="font-medium">{opt.name}</span>
                            <span className="text-muted-foreground text-xs ml-2">— {opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedStrategic && (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-sm">
                      <p className="font-medium text-amber-800">
                        選択中：{STRATEGIC_OPTIONS.find(o => o.key === selectedStrategic)?.name}
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {STRATEGIC_OPTIONS.find(o => o.key === selectedStrategic)?.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 文化軸 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="w-4 h-4 text-emerald-600">🌱</span>
                    選択文化軸（20点）
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    評価したい行動様式・組織文化を1つ選んでください。
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={selectedCultural} onValueChange={setSelectedCultural} disabled={readOnly}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="文化軸を選んでください" />
                    </SelectTrigger>
                    <SelectContent>
                      {CULTURAL_OPTIONS.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>
                          <div>
                            <span className="font-medium">{opt.name}</span>
                            <span className="text-muted-foreground text-xs ml-2">— {opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCultural && (
                    <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 text-sm">
                      <p className="font-medium text-emerald-800">
                        選択中：{CULTURAL_OPTIONS.find(o => o.key === selectedCultural)?.name}
                      </p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        {CULTURAL_OPTIONS.find(o => o.key === selectedCultural)?.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── 右カラム：現在の設定サマリー ── */}
            <div className="lg:col-span-5">
              <Card className="bg-kaios-dark border-kaios-dark-border text-primary-foreground shadow-xl sticky top-6">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="bg-gradient-to-r from-primary to-blue-300 bg-clip-text text-transparent">
                      現在の評価設定
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-kaios-dark-card border border-kaios-dark-border p-4 space-y-3">
                    <h4 className="text-xs font-bold text-primary tracking-wide uppercase">合計100点の内訳</h4>

                    {/* 固定3軸 */}
                    {FIXED_AXES.map(axis => (
                      <div key={axis.key} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3 h-3 text-primary/60" />
                          <span className="text-blue-100/80">{axis.name}</span>
                        </div>
                        <span className="font-bold text-primary">20点</span>
                      </div>
                    ))}

                    <div className="border-t border-kaios-dark-border pt-2 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400">⚡</span>
                          <span className="text-blue-100/80">
                            {selectedStrategic
                              ? STRATEGIC_OPTIONS.find(o => o.key === selectedStrategic)?.name
                              : <span className="text-blue-100/40 italic">未選択</span>}
                          </span>
                        </div>
                        <span className="font-bold text-amber-400">20点</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400">🌱</span>
                          <span className="text-blue-100/80">
                            {selectedCultural
                              ? CULTURAL_OPTIONS.find(o => o.key === selectedCultural)?.name
                              : <span className="text-blue-100/40 italic">未選択</span>}
                          </span>
                        </div>
                        <span className="font-bold text-emerald-400">20点</span>
                      </div>
                    </div>

                    <div className="border-t border-kaios-dark-border pt-2 flex items-center justify-between">
                      <span className="text-xs text-blue-100/60">合計</span>
                      <span className="text-xl font-black text-primary">100点</span>
                    </div>
                  </div>

                  {(!selectedStrategic || !selectedCultural) && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-200">
                        {!selectedStrategic && !selectedCultural
                          ? "戦略軸と文化軸を選択してください"
                          : !selectedStrategic
                          ? "戦略軸を選択してください"
                          : "文化軸を選択してください"}
                      </p>
                    </div>
                  )}

                  {selectedStrategic && selectedCultural && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-green-200">
                        評価軸の設定が完了しています。「設定を保存」を押すとAIがスコアを更新します。
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 警告バナー */}
          <div className="flex items-start gap-3 p-4 rounded-lg border bg-kaios-warning-bg border-kaios-warning-border">
            <AlertTriangle className="w-5 h-5 text-kaios-warning-text shrink-0 mt-0.5" />
            <p className="text-sm text-kaios-warning-text">
              <strong>適用範囲：</strong>この設定は「改善入力の自動評価」「類似事例の推薦」「インパクトの算出」に全社的に反映されます。
            </p>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
};

export default EvaluationSettings;
