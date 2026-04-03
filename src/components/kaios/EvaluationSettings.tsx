import { useState } from "react";
import { RefreshCw, Play, Save, AlertTriangle, History, Info, Sparkles, CheckCircle2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKaios } from "@/contexts/KaiosContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
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

const DEFAULT_SPEED = 50;
const DEFAULT_CROSS = 50;

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

const getHighEvalPatterns = (speed: number, cross: number) => {
  const patterns: string[] = [];
  if (speed >= 60) patterns.push("計画から実行まで2週間以内の短期改善サイクル");
  if (speed < 60) patterns.push("リスク分析と検証を含む堅実な改善プロセス");
  if (cross >= 70) patterns.push("3部署以上で再利用可能な標準化されたプロセス改善");
  if (cross >= 50) patterns.push("部門間のナレッジ共有を促進する取り組み");
  if (cross < 50) patterns.push("特定業務の深い専門性に基づく改善提案");
  if (speed >= 70 && cross >= 70) patterns.push("全社展開を前提とした迅速なパイロット施策");
  return patterns;
};

interface HistoryEntry {
  date: string;
  user: string;
  speed: number;
  cross: number;
}

const mockHistory: HistoryEntry[] = [
  { date: "2026-04-03 10:30", user: "山田 太郎", speed: 70, cross: 85 },
  { date: "2026-03-28 14:15", user: "佐藤 花子", speed: 60, cross: 75 },
  { date: "2026-03-15 09:00", user: "山田 太郎", speed: 50, cross: 50 },
  { date: "2026-03-01 11:45", user: "鈴木 一郎", speed: 40, cross: 60 },
];


const EvaluationSettings = () => {
  const { evalSettings, setEvalSettings, kaizenItems, calculateImpactScore, refreshItems } = useKaios();
  const [speed, setSpeed] = useState(evalSettings.speed);
  const [crossFunctional, setCrossFunctional] = useState(evalSettings.crossFunctional);
  const [savedSpeed, setSavedSpeed] = useState(evalSettings.speed);
  const [savedCross, setSavedCross] = useState(evalSettings.crossFunctional);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = speed !== savedSpeed || crossFunctional !== savedCross;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Call AI edge function to recalculate all scores
      const { data, error } = await supabase.functions.invoke("recalculate-impact", {
        body: { speed, crossFunctional },
      });

      if (error) {
        console.error("Recalculate error:", error);
        toast.error("AIによるスコア再計算に失敗しました");
        return;
      }

      setSavedSpeed(speed);
      setSavedCross(crossFunctional);
      setEvalSettings({ speed, crossFunctional });

      // Refresh items to get updated scores from DB
      await refreshItems();

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

  // Calculate how scores would change with new settings
  const scoreChanges = kaizenItems.map(item => {
    const currentScore = calculateImpactScore(item);
    // Simulate new score with pending settings
    const baseScore = 50;
    const speedBonus = speed * 0.15;
    const crossBonus = (item.adoptedBy.length * 8) * (crossFunctional / 100);
    const reproBonus = item.reproducibility === "高" ? 15 : item.reproducibility === "中" ? 8 : 0;
    const newScore = Math.min(100, Math.round(baseScore + speedBonus + crossBonus + reproBonus));
    return { item, currentScore, newScore, diff: newScore - currentScore };
  });
  const itemsWithChanges = scoreChanges.filter(s => s.diff !== 0);
  const avgDiff = itemsWithChanges.length > 0
    ? Math.round(itemsWithChanges.reduce((s, c) => s + c.diff, 0) / itemsWithChanges.length)
    : 0;

  const handleReset = () => {
    setSpeed(DEFAULT_SPEED);
    setCrossFunctional(DEFAULT_CROSS);
    toast.info("デフォルト値に戻しました");
  };

  // Use real kaizen items for test cases
  const testCaseItems = kaizenItems.slice(0, 3);
  const getTestScore = (item: typeof kaizenItems[0]) => {
    const tempItem = { ...item };
    return calculateImpactScore(tempItem);
  };

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">評価方針設定</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              AIが現場の改善案を評価・推薦する際の「基準（価値観）」をチューニングします。自社の現在のフェーズや戦略に合わせて、どの要素を高く評価するかを設定してください。
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
                    すべての評価ウェイトがデフォルト値（Speed: {DEFAULT_SPEED}%, Cross-functional: {DEFAULT_CROSS}%）にリセットされます。この操作は保存するまで確定しません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>リセット</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Test Cases Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Play className="w-4 h-4" />
                  テストケースで確認
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>テストケースでの評価シミュレーション</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  現在の設定（Speed: {speed}%, Cross-functional: {crossFunctional}%）でサンプル改善案を評価した結果：
                </p>
                <div className="space-y-3 mt-2">
                  {testCaseItems.map((tc, i) => {
                    const score = getTestScore(tc);
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
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">閉じる</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={!hasChanges}>
              <Save className="w-4 h-4" />
              設定を保存
            </Button>
          </div>
        </div>

        {/* Warning Alert */}
        <div className="flex items-start gap-3 p-4 rounded-lg border bg-kaios-warning-bg border-kaios-warning-border">
          <AlertTriangle className="w-5 h-5 text-kaios-warning-text shrink-0 mt-0.5" />
          <p className="text-sm text-kaios-warning-text">
            <strong>適用範囲と権限について：</strong>
            この設定は「改善入力の自動評価」「類似事例の推薦アルゴリズム」「インパクトの算出」に全社的に反映されます。変更できるのは「システム管理者」および「経営企画部」のみです。
          </p>
        </div>

        {/* Score Impact Preview - shows when settings changed */}
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

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Weight Settings */}
          <div className="lg:col-span-7">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg">評価ウェイト設定</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <History className="w-4 h-4" />
                      変更履歴を見る
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>変更履歴</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-2">
                      {mockHistory.map((entry, i) => (
                        <div key={i} className="p-3 rounded-lg border border-border bg-muted/30 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-foreground">{entry.user}</span>
                            <span className="text-xs text-muted-foreground">{entry.date}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Speed: {entry.speed}% / Cross-functional: {entry.cross}%
                          </p>
                        </div>
                      ))}
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">閉じる</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-8">
                <SliderParam
                  title="迅速な実行 (Speed)"
                  tooltip="計画から実行までのリードタイムの短さを評価する度合い"
                  description="計画から実行までのリードタイムの短さをどれだけ評価するか"
                  value={speed}
                  onChange={setSpeed}
                  leftLabel="慎重・確実重視 (0%)"
                  rightLabel="超高速重視 (100%)"
                />
                <SliderParam
                  title="部門横断での有効性 (Cross-functional)"
                  tooltip="他部署への波及効果や再利用性を評価する度合い"
                  description="他部署への波及効果や再利用性をどれだけ評価するか"
                  value={crossFunctional}
                  onChange={setCrossFunctional}
                  leftLabel="個別最適 (0%)"
                  rightLabel="全社最適 (100%)"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right: AI Simulation */}
          <div className="lg:col-span-5">
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
                    また、部門横断での有効性が
                    <span className="text-primary font-bold mx-1">{crossFunctional}%</span>
                    に設定されているため、{getCrossText(crossFunctional)}
                  </p>
                </div>

                <div className="rounded-lg bg-kaios-dark-card border border-kaios-dark-border p-4">
                  <h4 className="text-xs font-bold text-kaios-success tracking-wide uppercase mb-3">
                    高く評価される行動パターン
                  </h4>
                  <ul className="space-y-2.5">
                    {getHighEvalPatterns(speed, crossFunctional).map((pattern, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-blue-100/70">
                        <CheckCircle2 className="w-4 h-4 text-kaios-success shrink-0 mt-0.5" />
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg bg-kaios-dark-card border border-kaios-dark-border p-3 text-center">
                    <div className="text-2xl font-bold text-primary">{speed}%</div>
                    <div className="text-xs text-muted-foreground mt-1">Speed</div>
                  </div>
                  <div className="flex-1 rounded-lg bg-kaios-dark-card border border-kaios-dark-border p-3 text-center">
                    <div className="text-2xl font-bold text-primary">{crossFunctional}%</div>
                    <div className="text-xs text-muted-foreground mt-1">Cross-functional</div>
                  </div>
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
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => {
            const v = Math.min(100, Math.max(0, Number(e.target.value)));
            onChange(v);
          }}
          className="w-16 h-8 text-center text-sm font-medium"
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">{description}</p>
    <Slider
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      max={100}
      step={1}
      className="w-full"
    />
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{leftLabel}</span>
      <span>{rightLabel}</span>
    </div>
  </div>
);

export default EvaluationSettings;
