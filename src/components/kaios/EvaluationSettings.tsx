import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Play, Save, AlertTriangle, History, Info, Sparkles, CheckCircle2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKaios } from "@/contexts/KaiosContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import UITour, { type TourStep } from "@/components/kaios/UITour";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DEFAULTS = { speed: 50, crossFunctional: 50, reproducibilityWeight: 50, costEfficiency: 50, innovation: 50 };

const getSpeedText = (v: number) => {
  if (v <= 30) return "慎重かつ確実なプロセスを最優先し、十分な検証を経た改善を高く評価します。";
  if (v <= 60) return "スピードと品質のバランスを重視し、確実なステップを踏んだ改善を標準的に評価します。";
  if (v <= 80) return "スピーディーな実行力を高く評価し、迅速に成果を出す改善案を優先的に推薦します。";
  return "超高速な実行を最重視し、素早いPDCAサイクルで改善を推進する提案を最優先で評価します。";
};

const getCrossText = (v: number) => {
  if (v <= 30) return "各部門の専門性を重視した個別最適な改善を中心に評価します。";
  if (v <= 60) return "部門内での効果を基本としつつ、他部署への展開可能性も考慮します。";
  if (v <= 80) return "属人化の解消・再利用性・他部署への波及効果を高く評価します。";
  return "全社的なシナジーと部門横断での波及効果を極めて高く評価し、組織全体の変革を重視します。";
};

const getReproText = (v: number) => {
  if (v <= 30) return "一回限りの改善でも効果があれば評価します。";
  if (v <= 60) return "再現性のある改善を標準的に評価します。";
  return "高い再現性を持ち、標準化・横展開可能な改善を特に高く評価します。";
};

const getCostText = (v: number) => {
  if (v <= 30) return "コストよりも効果の大きさを重視します。";
  if (v <= 60) return "コストと効果のバランスを考慮します。";
  return "低コストで高い効果を発揮するコストパフォーマンスの高い改善を重視します。";
};

const getInnoText = (v: number) => {
  if (v <= 30) return "既存プロセスの改良・最適化を中心に評価します。";
  if (v <= 60) return "改良と革新のバランスを取りつつ評価します。";
  return "従来にない発想やアプローチによる革新的な改善を特に高く評価します。";
};

const getHighEvalPatterns = (s: number, c: number, r: number, ce: number, inn: number) => {
  const patterns: string[] = [];
  if (s >= 60) patterns.push("計画から実行まで2週間以内の短期改善サイクル");
  if (s < 60) patterns.push("リスク分析と検証を含む堅実な改善プロセス");
  if (c >= 70) patterns.push("3部署以上で再利用可能な標準化されたプロセス改善");
  if (c >= 50) patterns.push("部門間のナレッジ共有を促進する取り組み");
  if (c < 50) patterns.push("特定業務の深い専門性に基づく改善提案");
  if (r >= 60) patterns.push("マニュアル化・標準化により誰でも実施可能な改善");
  if (ce >= 60) patterns.push("最小限の投資で最大限の効果を生む改善施策");
  if (inn >= 60) patterns.push("AIやデジタル技術を活用した革新的な業務改善");
  if (s >= 70 && c >= 70) patterns.push("全社展開を前提とした迅速なパイロット施策");
  return patterns;
};

interface HistoryEntry {
  date: string;
  user: string;
  speed: number;
  cross: number;
  reproducibility: number;
  costEfficiency: number;
  innovation: number;
}

const TOUR_STEPS: TourStep[] = [
  { selector: '[data-tour="weight-settings"]', title: "① 評価ウェイト設定", description: "5つの評価軸それぞれのウェイト（重要度）をスライダーで調整します。数値を直接入力することもできます。", position: "right" },
  { selector: '[data-tour="ai-simulation"]', title: "② AI評価シミュレーション", description: "設定したウェイトに基づくAIの評価スタンスと、高く評価される行動パターンがリアルタイムでプレビューされます。", position: "left" },
  { selector: '[data-tour="score-preview"]', title: "③ スコア変動プレビュー", description: "ウェイトを変更すると、既存の改善案のスコアがどう変わるかプレビュー表示されます（変更時のみ表示）。", position: "bottom" },
  { selector: '[data-tour="test-cases"]', title: "④ テストケースで確認", description: "現在の設定でサンプル改善案を評価した結果をシミュレーションで確認できます。", position: "bottom" },
  { selector: '[data-tour="save-button"]', title: "⑤ 設定を保存", description: "保存するとAIが全改善案のインパクトスコアを新しいウェイトで再計算します。結果はインパクトの見える化に即時反映されます。", position: "bottom" },
  { selector: '[data-tour="history-button"]', title: "⑥ 変更履歴", description: "過去の設定変更（日時・変更者・各ウェイト値）を確認できます。", position: "bottom" },
];

const EvaluationSettings = () => {
  const { evalSettings, setEvalSettings, kaizenItems, calculateImpactScore, refreshItems } = useKaios();
  const [speed, setSpeed] = useState(evalSettings.speed);
  const [crossFunctional, setCrossFunctional] = useState(evalSettings.crossFunctional);
  const [reproducibilityWeight, setReproducibilityWeight] = useState(evalSettings.reproducibilityWeight);
  const [costEfficiency, setCostEfficiency] = useState(evalSettings.costEfficiency);
  const [innovation, setInnovation] = useState(evalSettings.innovation);

  const [savedSettings, setSavedSettings] = useState({ ...evalSettings });
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const fetchHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("eval_settings_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) {
        setHistory((data as any[]).map(row => ({
          date: new Date(row.created_at).toLocaleString("ja-JP"),
          user: row.updated_by || "システム",
          speed: row.speed,
          cross: row.cross_functional,
          reproducibility: row.reproducibility_weight ?? 50,
          costEfficiency: row.cost_efficiency ?? 50,
          innovation: row.innovation ?? 50,
        })));
      }
    } catch (e) {
      console.error("Error fetching history:", e);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    setSpeed(evalSettings.speed);
    setCrossFunctional(evalSettings.crossFunctional);
    setReproducibilityWeight(evalSettings.reproducibilityWeight);
    setCostEfficiency(evalSettings.costEfficiency);
    setInnovation(evalSettings.innovation);
    setSavedSettings({ ...evalSettings });
  }, [evalSettings]);

  const hasChanges = speed !== savedSettings.speed || crossFunctional !== savedSettings.crossFunctional
    || reproducibilityWeight !== savedSettings.reproducibilityWeight
    || costEfficiency !== savedSettings.costEfficiency
    || innovation !== savedSettings.innovation;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("recalculate-impact", {
        body: { speed, crossFunctional, reproducibilityWeight, costEfficiency, innovation },
      });

      if (error) {
        console.error("Recalculate error:", error);
        toast.error("AIによるスコア再計算に失敗しました");
        return;
      }

      await supabase.from("eval_settings_history").insert({
        speed,
        cross_functional: crossFunctional,
        reproducibility_weight: reproducibilityWeight,
        cost_efficiency: costEfficiency,
        innovation,
        updated_by: "山田 太郎",
      } as any);

      const newSettings = { speed, crossFunctional, reproducibilityWeight, costEfficiency, innovation };
      setSavedSettings(newSettings);
      setEvalSettings(newSettings);

      await Promise.all([refreshItems(), fetchHistory()]);

      toast.success("設定を保存し、AIでスコアを再計算しました", {
        description: `${data?.updated ?? 0}件の改善案のインパクトスコアが更新されました`,
      });
    } catch (e) {
      console.error("Save error:", e);
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const scoreChanges = kaizenItems.map(item => {
    const currentScore = item.impactScore;
    const baseScore = 30;
    const speedBonus = speed * 0.1;
    const crossBonus = (item.adoptedBy.length * 6) * (crossFunctional / 100);
    const reproBonus = item.reproducibility === "高" ? (reproducibilityWeight * 0.2) : item.reproducibility === "中" ? (reproducibilityWeight * 0.1) : 0;
    const costBonus = costEfficiency * 0.08;
    const innoBonus = innovation * 0.07;
    const newScore = Math.min(100, Math.round(baseScore + speedBonus + crossBonus + reproBonus + costBonus + innoBonus));
    return { item, currentScore, newScore, diff: newScore - currentScore };
  });
  const itemsWithChanges = scoreChanges.filter(s => s.diff !== 0);
  const avgDiff = itemsWithChanges.length > 0
    ? Math.round(itemsWithChanges.reduce((s, c) => s + c.diff, 0) / itemsWithChanges.length)
    : 0;

  const handleReset = () => {
    setSpeed(DEFAULTS.speed);
    setCrossFunctional(DEFAULTS.crossFunctional);
    setReproducibilityWeight(DEFAULTS.reproducibilityWeight);
    setCostEfficiency(DEFAULTS.costEfficiency);
    setInnovation(DEFAULTS.innovation);
    toast.info("デフォルト値に戻しました");
  };

  const testCaseItems = kaizenItems.slice(0, 3);

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">評価方針設定</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              AIが現場の改善案を評価・推薦する際の「基準（価値観）」をチューニングします。5つの評価軸のウェイトを設定してください。
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <UITour steps={TOUR_STEPS} tourKey="eval-settings" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <RefreshCw className="w-4 h-4" />
                  デフォルトに戻す
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>デフォルトに戻しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    すべての評価ウェイトがデフォルト値（各50%）にリセットされます。保存するまで確定しません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>リセット</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" data-tour="test-cases">
                  <Play className="w-4 h-4" />
                  テストケースで確認
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>テストケースでの評価シミュレーション</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  現在の設定でサンプル改善案を評価した結果：
                </p>
                <div className="space-y-3 mt-2">
                  {testCaseItems.map((tc, i) => {
                    const score = calculateImpactScore(tc);
                    return (
                      <div key={i} className="p-4 rounded-lg border border-border bg-muted/30">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-foreground">{tc.title}</h4>
                          <span className={`text-lg font-bold ${score >= 70 ? "text-kaios-success" : score >= 50 ? "text-primary" : "text-muted-foreground"}`}>
                            {score}点
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{tc.department} — {tc.solution}</p>
                      </div>
                    );
                  })}
                  {testCaseItems.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">改善案が登録されていません</p>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">閉じる</Button></DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={!hasChanges || isSaving} data-tour="save-button">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "AI再計算中..." : "設定を保存"}
            </Button>
          </div>
        </div>

        {/* Warning Alert */}
        <div className="flex items-start gap-3 p-4 rounded-lg border bg-kaios-warning-bg border-kaios-warning-border">
          <AlertTriangle className="w-5 h-5 text-kaios-warning-text shrink-0 mt-0.5" />
          <p className="text-sm text-kaios-warning-text">
            <strong>適用範囲と権限について：</strong>
            この設定は「改善入力の自動評価」「類似事例の推薦アルゴリズム」「インパクトの算出」に全社的に反映されます。
          </p>
        </div>

        {/* Score Impact Preview */}
        <div data-tour="score-preview">
          {hasChanges && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        スコア変動プレビュー: {itemsWithChanges.length}件 / {kaizenItems.length}件 のスコアが変動
                      </p>
                      <p className="text-xs text-muted-foreground">
                        平均スコア変動: <span className={avgDiff > 0 ? "text-kaios-success font-bold" : avgDiff < 0 ? "text-destructive font-bold" : ""}>
                          {avgDiff > 0 ? "+" : ""}{avgDiff}pt
                        </span>
                        {" "}— 保存するとインパクト見える化に即時反映されます
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Weight Settings */}
          <div className="lg:col-span-7" data-tour="weight-settings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg">評価ウェイト設定（5軸）</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="flex items-center gap-1.5 text-sm text-primary hover:underline" data-tour="history-button">
                      <History className="w-4 h-4" />
                      変更履歴を見る
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>変更履歴</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-2 max-h-[400px] overflow-auto">
                      {history.length > 0 ? history.map((entry, i) => (
                        <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-foreground">{entry.user}</span>
                            <span className="text-xs text-muted-foreground">{entry.date}</span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>Speed: {entry.speed}% / Cross: {entry.cross}% / 再現性: {entry.reproducibility}%</p>
                            <p>コスト効率: {entry.costEfficiency}% / 革新性: {entry.innovation}%</p>
                          </div>
                        </div>
                      )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">変更履歴はまだありません</p>
                      )}
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">閉じる</Button></DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-6">
                <SliderParam
                  title="迅速な実行 (Speed)"
                  tooltip="計画から実行までのリードタイムの短さを評価する度合い"
                  description="計画から実行までのリードタイムの短さをどれだけ評価するか"
                  value={speed} onChange={setSpeed}
                  leftLabel="慎重・確実重視 (0%)" rightLabel="超高速重視 (100%)"
                />
                <SliderParam
                  title="部門横断での有効性 (Cross-functional)"
                  tooltip="他部署への波及効果や再利用性を評価する度合い"
                  description="他部署への波及効果や再利用性をどれだけ評価するか"
                  value={crossFunctional} onChange={setCrossFunctional}
                  leftLabel="個別最適 (0%)" rightLabel="全社最適 (100%)"
                />
                <SliderParam
                  title="再現性の重視 (Reproducibility)"
                  tooltip="改善の標準化・横展開のしやすさを評価する度合い"
                  description="標準化・マニュアル化により他でも再現できる改善をどれだけ評価するか"
                  value={reproducibilityWeight} onChange={setReproducibilityWeight}
                  leftLabel="一回限りでもOK (0%)" rightLabel="高い再現性重視 (100%)"
                />
                <SliderParam
                  title="コスト効率 (Cost Efficiency)"
                  tooltip="低コストで高い効果を発揮する改善を評価する度合い"
                  description="投資対効果（ROI）の高さをどれだけ評価するか"
                  value={costEfficiency} onChange={setCostEfficiency}
                  leftLabel="効果重視 (0%)" rightLabel="高ROI重視 (100%)"
                />
                <SliderParam
                  title="革新性 (Innovation)"
                  tooltip="従来にない発想やアプローチを評価する度合い"
                  description="既存の改良だけでなく、新しいアプローチによる改善をどれだけ評価するか"
                  value={innovation} onChange={setInnovation}
                  leftLabel="改良型重視 (0%)" rightLabel="革新型重視 (100%)"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right: AI Simulation */}
          <div className="lg:col-span-5" data-tour="ai-simulation">
            <Card className="bg-kaios-dark border-kaios-dark-border text-primary-foreground shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="bg-gradient-to-r from-primary to-blue-300 bg-clip-text text-transparent">
                    AI評価シミュレーション
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-kaios-dark-card border border-kaios-dark-border p-4">
                  <h4 className="text-xs font-bold text-primary tracking-wide uppercase mb-2">
                    基本評価スタンス
                  </h4>
                  <p className="text-sm leading-relaxed text-blue-100/80">
                    {getSpeedText(speed)}
                    {getCrossText(crossFunctional)}
                    {getReproText(reproducibilityWeight)}
                    {getCostText(costEfficiency)}
                    {getInnoText(innovation)}
                  </p>
                </div>

                <div className="rounded-lg bg-kaios-dark-card border border-kaios-dark-border p-4">
                  <h4 className="text-xs font-bold text-kaios-success tracking-wide uppercase mb-3">
                    高く評価される行動パターン
                  </h4>
                  <ul className="space-y-2.5">
                    {getHighEvalPatterns(speed, crossFunctional, reproducibilityWeight, costEfficiency, innovation).map((pattern, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-blue-100/70">
                        <CheckCircle2 className="w-4 h-4 text-kaios-success shrink-0 mt-0.5" />
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "Speed", value: speed },
                    { label: "Cross", value: crossFunctional },
                    { label: "再現性", value: reproducibilityWeight },
                    { label: "コスト効率", value: costEfficiency },
                    { label: "革新性", value: innovation },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-kaios-dark-card border border-kaios-dark-border p-2 text-center">
                      <div className="text-lg font-bold text-primary">{value}%</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
};

interface SliderParamProps {
  title: string;
  tooltip: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  leftLabel: string;
  rightLabel: string;
}

const SliderParam = ({ title, tooltip, description, value, onChange, leftLabel, rightLabel }: SliderParamProps) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Tooltip>
          <TooltipTrigger>
            <Info className="w-4 h-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-1">
        <Input
          type="number" min={0} max={100} value={value}
          onChange={(e) => onChange(Math.min(100, Math.max(0, Number(e.target.value))))}
          className="w-16 h-8 text-center text-sm font-medium"
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">{description}</p>
    <Slider value={[value]} onValueChange={([v]) => onChange(v)} max={100} step={1} className="w-full" />
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{leftLabel}</span>
      <span>{rightLabel}</span>
    </div>
  </div>
);

export default EvaluationSettings;
