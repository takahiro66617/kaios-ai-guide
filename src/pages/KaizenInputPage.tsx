import { useState, useEffect } from "react";
import { Sparkles, Save, FileText, Tag, Building2, RefreshCw, Loader2, CheckCircle2, User, ChevronRight, Edit3, MapPin, BarChart2, Lightbulb, AlertTriangle, TrendingUp, Paperclip, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useKaios } from "@/contexts/KaiosContext";
import UITour, { type TourStep } from "@/components/kaios/UITour";

const KAIZEN_TOUR_STEPS: TourStep[] = [
  { selector: '[data-tour="person-selector"]', title: "① 提案者を選択", description: "改善案の提案者を選択します。提案者は事前に「提案者管理」ページで登録が必要です。", position: "bottom" },
  { selector: '[data-tour="step1-form"]', title: "② 必須項目を入力", description: "問題の内容・発生場所・影響・頻度・原因仮説・改善案の方向・期待効果の7項目を入力します。", position: "bottom" },
  { selector: '[data-tour="generate-button"]', title: "③ AIドラフトを生成", description: "入力内容をもとにAIが構造化された改善シートを自動生成します。その後、差分だけ修正して確定します。", position: "top" },
  { selector: '[data-tour="recent-items"]', title: "④ 最近の登録", description: "直近に登録した改善案が表示されます。登録後はインパクトの見える化にも反映されます。", position: "top" },
];
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Step = 1 | 2 | 3 | 4;

interface Step1Data {
  problem: string;
  occurrencePlace: string;
  impact: string;
  frequency: string;
  hypothesis: string;
  direction: string;
  expectedEffect: string;
  // optional
  relatedDepartments: string;
  numericalEvidence: string;
}

const INITIAL_STEP1: Step1Data = {
  problem: "",
  occurrencePlace: "",
  impact: "",
  frequency: "",
  hypothesis: "",
  direction: "",
  expectedEffect: "",
  relatedDepartments: "",
  numericalEvidence: "",
};

const FREQUENCY_OPTIONS = ["毎日", "週に数回", "週1回", "月に数回", "月1回以下", "不定期"];

const STEP_LABELS = [
  { num: 1, label: "最小十分入力" },
  { num: 2, label: "AIドラフト生成" },
  { num: 3, label: "差分修正" },
  { num: 4, label: "確定・蓄積" },
];

const KaizenInputPage = () => {
  const [step, setStep] = useState<Step>(1);
  const [step1Data, setStep1Data] = useState<Step1Data>(INITIAL_STEP1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiDraft, setAiDraft] = useState<any | null>(null);
  const [editedDraft, setEditedDraft] = useState<any | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const navigate = useNavigate();
  const { addKaizenItem, kaizenItems, people, getPersonById, evalAxes, calculateImpactScore } = useKaios();

  useEffect(() => {
    if (people.length > 0 && !selectedPersonId) {
      setSelectedPersonId(people[0].id);
    }
  }, [people, selectedPersonId]);

  const isStep1Valid = () => {
    const { problem, occurrencePlace, impact, frequency, hypothesis, direction, expectedEffect } = step1Data;
    return problem.trim() && occurrencePlace.trim() && impact.trim() && frequency.trim() && hypothesis.trim() && direction.trim() && expectedEffect.trim();
  };

  const handleGenerateDraft = async () => {
    if (!isStep1Valid()) { toast.error("必須項目をすべて入力してください"); return; }
    if (!selectedPersonId) { toast.error("提案者を選択してください"); return; }
    setIsProcessing(true);
    setStep(2);
    try {
      const inputText = `問題の内容: ${step1Data.problem}
発生場所: ${step1Data.occurrencePlace}
影響: ${step1Data.impact}
頻度: ${step1Data.frequency}
原因仮説: ${step1Data.hypothesis}
改善案の方向: ${step1Data.direction}
期待効果: ${step1Data.expectedEffect}
${step1Data.relatedDepartments ? `関係部署: ${step1Data.relatedDepartments}` : ""}
${step1Data.numericalEvidence ? `数値根拠: ${step1Data.numericalEvidence}` : ""}`;

      const { data, error } = await supabase.functions.invoke("structure-kaizen", { body: { text: inputText } });
      if (error) throw new Error(error.message || "AI処理に失敗しました");
      if (data?.error) throw new Error(data.error);
      if (data?.structured) {
        setAiDraft(data.structured);
        setEditedDraft({ ...data.structured });
        toast.success("AIがドラフトを生成しました");
      } else {
        throw new Error("構造化データが返されませんでした");
      }
    } catch (e: any) {
      console.error("Structure error:", e);
      toast.error(e.message || "AI処理中にエラーが発生しました");
      setStep(1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditField = (field: string, value: string) => {
    setEditedDraft((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    if (!editedDraft) return;
    if (!selectedPersonId) { toast.error("提案者を選択してください"); return; }

    const relatedDepts = editedDraft.related_departments || [];

    const savedItem = await addKaizenItem({
      title: editedDraft.title,
      problem: editedDraft.problem,
      cause: editedDraft.cause,
      solution: editedDraft.solution,
      effect: editedDraft.effect,
      department: editedDraft.department,
      category: editedDraft.category,
      reproducibility: editedDraft.reproducibility || "中",
      tags: editedDraft.tags || [],
      authorId: selectedPersonId,
      adoptedBy: relatedDepts,
      occurrencePlace: step1Data.occurrencePlace,
      frequency: step1Data.frequency,
      numericalEvidence: step1Data.numericalEvidence,
    });

    if (!savedItem) return;

    setStep(4);
    toast.success("ナレッジベースに登録しました", {
      description: `「${savedItem.title}」（関連部署: ${relatedDepts.length}件）`,
    });
  };

  const handleReset = () => {
    setStep(1);
    setStep1Data(INITIAL_STEP1);
    setAiDraft(null);
    setEditedDraft(null);
  };

  const recentItems = kaizenItems.filter(k => k.status !== "新規").slice(0, 3);

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-6 max-w-[1100px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">改善入力と整理</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              4ステップで改善案を効率的に登録。AIが構造化ドラフトを生成し、ズレだけ修正すれば完了です。
            </p>
          </div>
          <UITour steps={KAIZEN_TOUR_STEPS} tourKey="kaizen-input" />
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {STEP_LABELS.map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                step === s.num ? "bg-primary text-primary-foreground" :
                step > s.num ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {step > s.num ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{s.num}</span>}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {idx < STEP_LABELS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Person Selector - always visible */}
        <Card data-tour="person-selector">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">提案者:</span>
              <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="提案者を選択" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}（{p.department}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(() => {
                const person = getPersonById(selectedPersonId);
                return person ? (
                  <span className="text-xs text-muted-foreground">{person.role} ・ 入社{person.yearsAtCompany}年目</span>
                ) : null;
              })()}
            </div>
          </CardContent>
        </Card>

        {/* ===== STEP 1: 最小十分入力 ===== */}
        {step === 1 && (
          <Card data-tour="step1-form">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary" />
                Step1: 最小十分入力
              </CardTitle>
              <p className="text-xs text-muted-foreground">AIが意味を外さず構造化できるレベルの情報を最短で入力してください。</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Required */}
              <p className="text-xs font-bold text-foreground flex items-center gap-1"><span className="text-destructive">*</span> 必須項目</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1.5 text-sm"><AlertTriangle className="w-3.5 h-3.5 text-destructive" />問題の内容 <span className="text-destructive">*</span></Label>
                  <Textarea
                    placeholder="例: 営業資料の最新版がどこにあるか分からず、古い資料で提案してしまうことがある"
                    value={step1Data.problem}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, problem: e.target.value }))}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm"><MapPin className="w-3.5 h-3.5 text-primary" />発生場所 <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="例: 営業部 / 第2製造ライン / 経理課"
                    value={step1Data.occurrencePlace}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, occurrencePlace: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm"><BarChart2 className="w-3.5 h-3.5 text-primary" />影響 <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="例: 提案の失注率が上がる / 手戻りが発生"
                    value={step1Data.impact}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, impact: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm"><RefreshCw className="w-3.5 h-3.5 text-primary" />頻度 <span className="text-destructive">*</span></Label>
                  <Select value={step1Data.frequency} onValueChange={(v) => setStep1Data(prev => ({ ...prev, frequency: v }))}>
                    <SelectTrigger><SelectValue placeholder="頻度を選択" /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm"><Lightbulb className="w-3.5 h-3.5 text-primary" />原因仮説 <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="例: 資料の保管場所が統一されていない"
                    value={step1Data.hypothesis}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, hypothesis: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm"><TrendingUp className="w-3.5 h-3.5 text-primary" />改善案の方向 <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="例: 社内Wikiに全資料を一元管理する"
                    value={step1Data.direction}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, direction: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1.5 text-sm"><Sparkles className="w-3.5 h-3.5 text-primary" />期待効果 <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="例: 資料検索時間50%削減、提案精度向上"
                    value={step1Data.expectedEffect}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, expectedEffect: e.target.value }))}
                  />
                </div>
              </div>

              {/* Optional */}
              <div className="border-t border-border pt-4 mt-4">
                <p className="text-xs font-bold text-muted-foreground mb-3">任意項目（入力するとAIの精度が向上します）</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-sm"><Building2 className="w-3.5 h-3.5 text-muted-foreground" />関係部署</Label>
                    <Input
                      placeholder="例: マーケティング部, カスタマーサポート部"
                      value={step1Data.relatedDepartments}
                      onChange={(e) => setStep1Data(prev => ({ ...prev, relatedDepartments: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-sm"><Hash className="w-3.5 h-3.5 text-muted-foreground" />数値根拠</Label>
                    <Input
                      placeholder="例: 月20件の手戻り、年間100時間のロス"
                      value={step1Data.numericalEvidence}
                      onChange={(e) => setStep1Data(prev => ({ ...prev, numericalEvidence: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2" data-tour="generate-button">
                <Button onClick={handleGenerateDraft} disabled={!isStep1Valid() || isProcessing} className="gap-2">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  AIドラフトを生成する
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== STEP 2: AI Processing ===== */}
        {step === 2 && isProcessing && (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-base font-medium text-foreground mb-1">AIが改善シートのドラフトを生成中...</p>
            <p className="text-sm text-muted-foreground">入力された情報をもとに、構造化された改善案を作成しています</p>
          </div>
        )}

        {/* ===== STEP 2→3: AI Draft Review & Edit ===== */}
        {(step === 2 || step === 3) && !isProcessing && editedDraft && (
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {step === 2 ? (
                    <><CheckCircle2 className="w-5 h-5 text-kaios-success" />Step2: AIドラフト生成完了</>
                  ) : (
                    <><Edit3 className="w-5 h-5 text-primary" />Step3: 差分修正</>
                  )}
                </CardTitle>
                {/* Impact preview */}
                <div className="text-center shrink-0 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
                  <p className="text-xs text-muted-foreground">予測インパクト</p>
                  <p className="text-2xl font-bold text-primary">
                    {calculateImpactScore({
                      id: "preview", title: editedDraft.title, problem: editedDraft.problem, cause: editedDraft.cause,
                      solution: editedDraft.solution, effect: editedDraft.effect, department: editedDraft.department,
                      category: editedDraft.category, reproducibility: editedDraft.reproducibility || "中",
                      tags: editedDraft.tags || [], status: "構造化済み", authorId: selectedPersonId,
                      createdAt: new Date().toISOString().slice(0, 10),
                      adoptedBy: editedDraft.related_departments || [],
                      impactScore: 0, occurrencePlace: step1Data.occurrencePlace,
                      frequency: step1Data.frequency, numericalEvidence: step1Data.numericalEvidence,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">/ 100</p>
                </div>
              </div>
              {step === 2 && (
                <p className="text-xs text-muted-foreground mt-1">AIが生成したドラフトです。内容を確認し、修正が必要な場合は「差分修正に進む」を押してください。</p>
              )}
              {step === 3 && (
                <p className="text-xs text-muted-foreground mt-1">各フィールドを直接編集できます。ズレている箇所だけ修正してください。</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Eval settings context */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                現在の評価方針: Speed {evalSettings.speed}% / Cross-functional {evalSettings.crossFunctional}%
              </div>

              {/* Editable fields */}
              <EditableField label="タイトル" value={editedDraft.title} onChange={(v) => handleEditField("title", v)} readOnly={step === 2} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField label="🔴 課題" value={editedDraft.problem} onChange={(v) => handleEditField("problem", v)} readOnly={step === 2} multiline />
                <EditableField label="🔍 原因" value={editedDraft.cause} onChange={(v) => handleEditField("cause", v)} readOnly={step === 2} multiline />
                <EditableField label="💡 解決策" value={editedDraft.solution} onChange={(v) => handleEditField("solution", v)} readOnly={step === 2} multiline />
                <EditableField label="📈 効果" value={editedDraft.effect} onChange={(v) => handleEditField("effect", v)} readOnly={step === 2} multiline />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <EditableField label="部門" value={editedDraft.department} onChange={(v) => handleEditField("department", v)} readOnly={step === 2} />
                <EditableField label="カテゴリ" value={editedDraft.category} onChange={(v) => handleEditField("category", v)} readOnly={step === 2} />
                <EditableField label="再現性" value={editedDraft.reproducibility} onChange={(v) => handleEditField("reproducibility", v)} readOnly={step === 2} />
              </div>

              {/* Related departments */}
              {editedDraft.related_departments && editedDraft.related_departments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">🏢 AIが検出した関連部署</p>
                  <div className="flex flex-wrap gap-1.5">
                    {editedDraft.related_departments.map((dept: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
                        <Building2 className="w-3 h-3 mr-1" />{dept}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">タグ</p>
                <div className="flex flex-wrap gap-1.5">
                  {(editedDraft.tags || []).map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs"><Tag className="w-3 h-3 mr-1" />{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                {step === 2 && (
                  <>
                    <Button size="sm" className="gap-1.5" onClick={handleRegister}>
                      <FileText className="w-4 h-4" />このまま登録する
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setStep(3)}>
                      <Edit3 className="w-4 h-4" />差分修正に進む
                    </Button>
                  </>
                )}
                {step === 3 && (
                  <>
                    <Button size="sm" className="gap-1.5" onClick={handleRegister}>
                      <FileText className="w-4 h-4" />確定してナレッジ登録
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setStep(2)}>
                      ドラフトに戻す
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setStep(1)}>
                  <RefreshCw className="w-4 h-4" />Step1からやり直す
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== STEP 4: Complete ===== */}
        {step === 4 && (
          <Card className="border-kaios-success/30 bg-kaios-success/5">
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-kaios-success mx-auto" />
              <h2 className="text-xl font-bold text-foreground">ナレッジ登録完了</h2>
              <p className="text-sm text-muted-foreground">
                改善案がナレッジベースに蓄積されました。インパクトの見える化ページに即座に反映されます。
              </p>
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button onClick={handleReset} className="gap-1.5">
                  <RefreshCw className="w-4 h-4" />新しい改善案を入力
                </Button>
                <Button variant="outline" onClick={() => navigate("/impact")} className="gap-1.5">
                  <BarChart2 className="w-4 h-4" />インパクトを確認
                </Button>
                <Button variant="outline" onClick={() => navigate("/similar-cases")} className="gap-1.5">
                  <FileText className="w-4 h-4" />類似事例を探す
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent items - visible on step 1 and 4 */}
        {(step === 1 || step === 4) && recentItems.length > 0 && (
          <div className="space-y-3" data-tour="recent-items">
            <h3 className="text-sm font-semibold text-muted-foreground">最近登録された改善案</h3>
            {recentItems.map((item) => {
              const author = getPersonById(item.authorId);
              return (
                <Card key={item.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          <span>{item.department}</span>
                          {author && <span className="text-primary">{author.name}</span>}
                          <span>{item.createdAt}</span>
                          {item.adoptedBy.length > 0 && (
                            <span className="text-kaios-success">{item.adoptedBy.length}部門関連</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">{item.impactScore}pt</span>
                        <Badge variant="secondary" className="text-xs">{item.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

// Editable field component
const EditableField = ({ label, value, onChange, readOnly = false, multiline = false }: {
  label: string; value: string; onChange: (v: string) => void; readOnly?: boolean; multiline?: boolean;
}) => (
  <div className="rounded-lg border border-border bg-muted/30 p-3">
    <p className="text-xs font-bold text-muted-foreground mb-1.5">{label}</p>
    {readOnly ? (
      <p className="text-sm text-foreground">{value}</p>
    ) : multiline ? (
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="resize-none text-sm" />
    ) : (
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-sm" />
    )}
  </div>
);

export default KaizenInputPage;
