import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Play, Save, AlertTriangle, History, Info, Sparkles, CheckCircle2, X, Loader2, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKaios, type EvalAxis } from "@/contexts/KaiosContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import UITour, { type TourStep } from "@/components/kaios/UITour";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const TOUR_STEPS: TourStep[] = [
  { selector: '[data-tour="weight-settings"]', title: "① 評価ウェイト設定", description: "各評価軸のウェイト（重要度）をスライダーで調整します。軸の追加・削除も可能です。", position: "right" },
  { selector: '[data-tour="add-axis"]', title: "② 軸を追加", description: "新しい評価軸を追加できます。名前、説明、ラベルなどを設定してください。", position: "bottom" },
  { selector: '[data-tour="ai-simulation"]', title: "③ AI評価シミュレーション", description: "設定したウェイトに基づくAIの評価スタンスがリアルタイムでプレビューされます。", position: "left" },
  { selector: '[data-tour="save-button"]', title: "④ 設定を保存", description: "保存するとAIが全改善案のインパクトスコアを新しいウェイトで再計算します。", position: "bottom" },
];

interface LocalWeight {
  id: string;
  weight: number;
}

const EvaluationSettings = () => {
  const { evalAxes, refreshEvalAxes, addEvalAxis, updateEvalAxis, deleteEvalAxis, updateAxisWeight, kaizenItems, calculateImpactScore, refreshItems } = useKaios();
  const [localWeights, setLocalWeights] = useState<LocalWeight[]>([]);
  const [savedWeights, setSavedWeights] = useState<LocalWeight[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAxis, setNewAxis] = useState({ name: "", key: "", description: "", tooltip: "", leftLabel: "低 (0%)", rightLabel: "高 (100%)" });
  const [history, setHistory] = useState<any[]>([]);

  const activeAxes = evalAxes.filter(a => a.isActive);

  useEffect(() => {
    const weights = evalAxes.map(a => ({ id: a.id, weight: a.weight }));
    setLocalWeights(weights);
    setSavedWeights(weights);
  }, [evalAxes]);

  const fetchHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("eval_settings_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) setHistory(data as any[]);
    } catch (e) { console.error("Error fetching history:", e); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const getLocalWeight = (id: string) => localWeights.find(w => w.id === id)?.weight ?? 50;
  const setLocalWeight = (id: string, weight: number) => {
    setLocalWeights(prev => prev.map(w => w.id === id ? { ...w, weight } : w));
  };

  const hasChanges = localWeights.some(lw => {
    const saved = savedWeights.find(sw => sw.id === lw.id);
    return !saved || saved.weight !== lw.weight;
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all axis weights to DB
      for (const lw of localWeights) {
        await supabase.from("eval_axes").update({ weight: lw.weight }).eq("id", lw.id);
      }

      // Build axes data for edge function
      const axesForAI = activeAxes.map(a => ({
        key: a.key,
        name: a.name,
        description: a.description,
        weight: getLocalWeight(a.id),
      }));

      const { data, error } = await supabase.functions.invoke("recalculate-impact", {
        body: { axes: axesForAI },
      });

      if (error) { toast.error("AIによるスコア再計算に失敗しました"); return; }

      // Save history
      const axisWeightsObj: any = {};
      activeAxes.forEach(a => { axisWeightsObj[a.key] = getLocalWeight(a.id); });
      await supabase.from("eval_settings_history").insert({
        speed: axisWeightsObj.speed ?? 50,
        cross_functional: axisWeightsObj.cross_functional ?? 50,
        reproducibility_weight: axisWeightsObj.reproducibility ?? 50,
        cost_efficiency: axisWeightsObj.cost_efficiency ?? 50,
        innovation: axisWeightsObj.innovation ?? 50,
        updated_by: "管理者",
      } as any);

      setSavedWeights([...localWeights]);
      await Promise.all([refreshItems(), refreshEvalAxes(), fetchHistory()]);

      toast.success("設定を保存し、AIでスコアを再計算しました", {
        description: `${data?.updated ?? 0}件の改善案のインパクトスコアが更新されました`,
      });
    } catch (e) { toast.error("保存に失敗しました"); }
    finally { setIsSaving(false); }
  };

  const handleAddAxis = async () => {
    if (!newAxis.name || !newAxis.key) { toast.error("名前とキーは必須です"); return; }
    const maxOrder = evalAxes.reduce((m, a) => Math.max(m, a.sortOrder), 0);
    const result = await addEvalAxis({
      name: newAxis.name, key: newAxis.key, description: newAxis.description,
      tooltip: newAxis.tooltip || newAxis.description,
      leftLabel: newAxis.leftLabel, rightLabel: newAxis.rightLabel,
      defaultValue: 50, weight: 50, sortOrder: maxOrder + 1,
    });
    if (result) {
      toast.success(`評価軸「${newAxis.name}」を追加しました`);
      setNewAxis({ name: "", key: "", description: "", tooltip: "", leftLabel: "低 (0%)", rightLabel: "高 (100%)" });
      setShowAddDialog(false);
    }
  };

  const handleDeleteAxis = async (axis: EvalAxis) => {
    await deleteEvalAxis(axis.id);
    toast.success(`評価軸「${axis.name}」を削除しました`);
  };

  const handleToggleActive = async (axis: EvalAxis) => {
    await updateEvalAxis(axis.id, { isActive: !axis.isActive });
    toast.info(`評価軸「${axis.name}」を${axis.isActive ? "無効" : "有効"}にしました`);
  };

  const handleReset = () => {
    setLocalWeights(evalAxes.map(a => ({ id: a.id, weight: a.defaultValue })));
    toast.info("デフォルト値に戻しました");
  };

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">評価方針設定</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              AIが改善案を評価する際の評価軸とウェイトを設定します。軸の追加・削除・有効/無効の切替が可能です。
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <UITour steps={TOUR_STEPS} tourKey="eval-settings" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <RefreshCw className="w-4 h-4" />デフォルトに戻す
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>デフォルトに戻しますか？</AlertDialogTitle>
                  <AlertDialogDescription>すべてのウェイトがデフォルト値にリセットされます。保存するまで確定しません。</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>リセット</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{entry.updated_by || "システム"}</span>
                        <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString("ja-JP")}</span>
                      </div>
                    </div>
                  )) : <p className="text-sm text-muted-foreground text-center py-4">変更履歴はまだありません</p>}
                </div>
                <DialogFooter><DialogClose asChild><Button variant="outline">閉じる</Button></DialogClose></DialogFooter>
              </DialogContent>
            </Dialog>

            <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={!hasChanges || isSaving} data-tour="save-button">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "AI再計算中..." : "設定を保存"}
            </Button>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 rounded-lg border bg-kaios-warning-bg border-kaios-warning-border">
          <AlertTriangle className="w-5 h-5 text-kaios-warning-text shrink-0 mt-0.5" />
          <p className="text-sm text-kaios-warning-text">
            <strong>適用範囲：</strong>この設定は「改善入力の自動評価」「類似事例の推薦」「インパクトの算出」に全社的に反映されます。
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Weight Settings */}
          <div className="lg:col-span-7" data-tour="weight-settings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg">評価ウェイト設定（{activeAxes.length}軸）</CardTitle>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5" data-tour="add-axis">
                      <Plus className="w-4 h-4" />軸を追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>新しい評価軸を追加</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>軸名 *</Label><Input placeholder="例: 安全性" value={newAxis.name} onChange={e => setNewAxis(p => ({ ...p, name: e.target.value }))} /></div>
                        <div><Label>キー *</Label><Input placeholder="例: safety" value={newAxis.key} onChange={e => setNewAxis(p => ({ ...p, key: e.target.value.replace(/[^a-z0-9_]/g, "") }))} /></div>
                      </div>
                      <div><Label>説明</Label><Textarea placeholder="この軸の評価基準を説明..." value={newAxis.description} onChange={e => setNewAxis(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>左ラベル（低い時）</Label><Input value={newAxis.leftLabel} onChange={e => setNewAxis(p => ({ ...p, leftLabel: e.target.value }))} /></div>
                        <div><Label>右ラベル（高い時）</Label><Input value={newAxis.rightLabel} onChange={e => setNewAxis(p => ({ ...p, rightLabel: e.target.value }))} /></div>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">キャンセル</Button></DialogClose>
                      <Button onClick={handleAddAxis}><Plus className="w-4 h-4 mr-1" />追加</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-6">
                {evalAxes.map(axis => (
                  <div key={axis.id} className={`space-y-3 p-4 rounded-lg border ${axis.isActive ? "border-border bg-background" : "border-dashed border-muted-foreground/30 bg-muted/20 opacity-60"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold text-foreground">{axis.name}</h3>
                        <Tooltip>
                          <TooltipTrigger><Info className="w-4 h-4 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent>{axis.tooltip || axis.description}</TooltipContent>
                        </Tooltip>
                        {!axis.isActive && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">無効</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={axis.isActive} onCheckedChange={() => handleToggleActive(axis)} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>「{axis.name}」を削除しますか？</AlertDialogTitle>
                              <AlertDialogDescription>この評価軸を完全に削除します。この操作は取り消せません。</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAxis(axis)} className="bg-destructive text-destructive-foreground">削除</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        {axis.isActive && (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number" min={0} max={100} value={getLocalWeight(axis.id)}
                              onChange={(e) => setLocalWeight(axis.id, Math.min(100, Math.max(0, Number(e.target.value))))}
                              className="w-16 h-8 text-center text-sm font-medium"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {axis.isActive && (
                      <>
                        <p className="text-xs text-muted-foreground">{axis.description}</p>
                        <Slider value={[getLocalWeight(axis.id)]} onValueChange={([v]) => setLocalWeight(axis.id, v)} max={100} step={1} className="w-full" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{axis.leftLabel}</span>
                          <span>{axis.rightLabel}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {evalAxes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">評価軸がありません。「軸を追加」ボタンで追加してください。</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: AI Simulation */}
          <div className="lg:col-span-5" data-tour="ai-simulation">
            <Card className="bg-kaios-dark border-kaios-dark-border text-primary-foreground shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="bg-gradient-to-r from-primary to-blue-300 bg-clip-text text-transparent">AI評価シミュレーション</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-kaios-dark-card border border-kaios-dark-border p-4">
                  <h4 className="text-xs font-bold text-primary tracking-wide uppercase mb-2">現在の評価スタンス</h4>
                  <p className="text-sm leading-relaxed text-blue-100/80">
                    {activeAxes.length === 0 ? "評価軸が設定されていません。" :
                      activeAxes.map(a => {
                        const w = getLocalWeight(a.id);
                        if (w >= 70) return `「${a.name}」を特に重視。`;
                        if (w >= 40) return `「${a.name}」を標準的に考慮。`;
                        return `「${a.name}」は控えめに評価。`;
                      }).join(" ")
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-kaios-dark-card border border-kaios-dark-border p-4">
                  <h4 className="text-xs font-bold text-kaios-success tracking-wide uppercase mb-3">有効な評価軸</h4>
                  <ul className="space-y-2.5">
                    {activeAxes.map(a => (
                      <li key={a.id} className="flex items-start gap-2.5 text-sm text-blue-100/70">
                        <CheckCircle2 className="w-4 h-4 text-kaios-success shrink-0 mt-0.5" />
                        <span><strong>{a.name}</strong>: {getLocalWeight(a.id)}% — {a.description || "説明なし"}</span>
                      </li>
                    ))}
                    {activeAxes.length === 0 && (
                      <li className="text-sm text-blue-100/50">有効な評価軸がありません</li>
                    )}
                  </ul>
                </div>

                <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${Math.min(activeAxes.length, 5)}, 1fr)` }}>
                  {activeAxes.map(a => (
                    <div key={a.id} className="rounded-lg bg-kaios-dark-card border border-kaios-dark-border p-2 text-center">
                      <div className="text-lg font-bold text-primary">{getLocalWeight(a.id)}%</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{a.name}</div>
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

export default EvaluationSettings;
