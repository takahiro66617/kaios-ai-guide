import { useState, useMemo } from "react";
import { Sparkles, FileText, RefreshCw, Loader2, CheckCircle2, User, ChevronRight, Edit3, MapPin, BarChart2, Lightbulb, AlertTriangle, TrendingUp, Building2, Hash } from "lucide-react";
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
import { useGuestProfile } from "@/contexts/GuestProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import UITour, { type TourStep } from "@/components/kaios/UITour";
import SubmissionCompleteModal from "@/components/gamification/SubmissionCompleteModal";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const KAIZEN_TOUR_STEPS: TourStep[] = [
  { selector: '[data-tour="me-card"]', title: "① 投稿者は自分", description: "ログイン中のあなた本人として投稿されます。他の人として投稿することはできません。", position: "bottom" },
  { selector: '[data-tour="step1-form"]', title: "② 必須項目を入力", description: "問題の内容・発生場所・影響・頻度・原因仮説・改善案の方向・期待効果の7項目を入力します。", position: "bottom" },
  { selector: '[data-tour="generate-button"]', title: "③ AIドラフトを生成", description: "入力内容をもとにAIが構造化された改善シートを自動生成します。その後、差分だけ修正して確定します。", position: "top" },
  { selector: '[data-tour="recent-items"]', title: "④ 最近の登録", description: "直近に登録した改善案が表示されます。", position: "top" },
];

type Step = 1 | 2 | 3 | 4;

interface Step1Data {
  problem: string;
  occurrencePlace: string;
  impact: string;
  frequency: string;
  hypothesis: string;
  direction: string;
  expectedEffect: string;
  relatedDepartments: string;
  numericalEvidence: string;
}

const INITIAL_STEP1: Step1Data = {
  problem: "", occurrencePlace: "", impact: "", frequency: "",
  hypothesis: "", direction: "", expectedEffect: "",
  relatedDepartments: "", numericalEvidence: "",
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
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionData, setCompletionData] = useState<{ impactScore: number; xpGained: number; oldLevel: number; newLevel: number; completedMissions: { title: string; icon: string; xpReward: number }[] }>({ impactScore: 0, xpGained: 0, oldLevel: 1, newLevel: 1, completedMissions: [] });
  const navigate = useNavigate();
  const { addKaizenItem, kaizenItems, people } = useKaios();
  const { addXp, incrementSubmissions, checkAndCompleteMissions, profile } = useGuestProfile();
  const { user, profile: authProfile } = useAuth();

  // ログイン本人の people 行を解決
  const mePerson = useMemo(
    () => (user ? people.find(p => p.userId === user.id) || null : null),
    [user, people]
  );

  const isStep1Valid = () => {
    const { problem, occurrencePlace, impact, frequency, hypothesis, direction, expectedEffect } = step1Data;
    return problem.trim() && occurrencePlace.trim() && impact.trim() && frequency.trim() && hypothesis.trim() && direction.trim() && expectedEffect.trim();
  };

  const handleGenerateDraft = async () => {
    if (!mePerson) { toast.error("あなたの提案者プロフィールが未登録です。管理者に依頼してください。"); return; }
    if (!isStep1Valid()) { toast.error("必須項目をすべて入力してください"); return; }
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
    if (!mePerson) { toast.error("あなたの提案者プロフィールが未登録です。"); return; }
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
      authorId: mePerson.id,
      authorNameSnapshot: mePerson.name,
      adoptedBy: relatedDepts,
      occurrencePlace: step1Data.occurrencePlace,
      frequency: step1Data.frequency,
      numericalEvidence: step1Data.numericalEvidence,
    });

    if (!savedItem) return;

    await incrementSubmissions();
    const baseXp = 30;
    const bonusXp = savedItem.impactScore >= 80 ? 50 : savedItem.impactScore >= 60 ? 20 : 0;
    const totalXp = baseXp + bonusXp;
    const { oldLevel, newLevel } = await addXp(totalXp);

    const newSubmissionCount = (profile?.totalSubmissions || 0) + 1;
    const completedMissions = await checkAndCompleteMissions({
      submissionCount: newSubmissionCount,
      impactScore: savedItem.impactScore,
      hasMultiDept: relatedDepts.length > 0,
    });

    let missionXp = 0;
    for (const m of completedMissions) missionXp += m.xpReward;
    if (missionXp > 0) {
      const result = await addXp(missionXp);
      setCompletionData({
        impactScore: savedItem.impactScore, xpGained: totalXp + missionXp,
        oldLevel, newLevel: result.newLevel,
        completedMissions: completedMissions.map(m => ({ title: m.title, icon: m.icon, xpReward: m.xpReward })),
      });
    } else {
      setCompletionData({
        impactScore: savedItem.impactScore, xpGained: totalXp,
        oldLevel, newLevel, completedMissions: [],
      });
    }

    setStep(4);
    setShowCompleteModal(true);
  };

  const handleReset = () => {
    setStep(1);
    setStep1Data(INITIAL_STEP1);
    setAiDraft(null);
    setEditedDraft(null);
  };

  const recentItems = kaizenItems
    .filter(k => k.status !== "新規" && k.authorId === mePerson?.id)
    .slice(0, 3);

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-4 sm:p-6 max-w-[1100px] mx-auto space-y-6">
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

        {/* Me card - 投稿者は本人固定 */}
        <Card data-tour="me-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">投稿者:</span>
              {mePerson ? (
                <>
                  <span className="text-sm font-bold">{mePerson.name}</span>
                  <Badge variant="outline" className="text-xs">{mePerson.department}</Badge>
                  {mePerson.role && <span className="text-xs text-muted-foreground">{mePerson.role}・入社{mePerson.yearsAtCompany}年目</span>}
                </>
              ) : (
                <span className="text-sm text-destructive">
                  あなたの提案者プロフィールが未登録です。管理者に依頼してください（ログイン名: {authProfile?.username}）。
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ===== STEP 1 ===== */}
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
              <p className="text-xs font-bold text-foreground flex items-center gap-1"><span className="text-destructive">*</span> 必須項目</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1.5 text-sm"><AlertTriangle className="w-3.5 h-3.5 text-destructive" />問題の内容 <span className="text-destructive">*</span></Label>
                  <Textarea placeholder="例: 営業資料の最新版がどこにあるか分からず、古い資料で提案してしまうことがある"
                    value={step1Data.problem}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, problem: e.target.value }))}
                    rows={3} className="resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm"><MapPin className="w-3.5 h-3.5 text-primary" />発生場所 <span className="text-destructive">*</span></Label>
                  <Input placeholder="例: 営業部 / 第2製造ライン / 経理課"
                    value={step1Data.occurrencePlace}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, occurrencePlace: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm"><BarChart2 className="w-3.5 h-3.5 text-primary" />影響 <span className="text-destructive">*</span></Label>
                  <Input placeholder="例: 提案の失注率が上がる / 手戻りが発生"
                    value={step1Data.impact}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, impact: e.target.value }))} />
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
                  <Input placeholder="例: 資料の保管場所が統一されていない"
                    value={step1Data.hypothesis}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, hypothesis: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm"><TrendingUp className="w-3.5 h-3.5 text-primary" />改善案の方向 <span className="text-destructive">*</span></Label>
                  <Input placeholder="例: 社内Wikiに全資料を一元管理する"
                    value={step1Data.direction}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, direction: e.target.value }))} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1.5 text-sm"><Sparkles className="w-3.5 h-3.5 text-primary" />期待効果 <span className="text-destructive">*</span></Label>
                  <Input placeholder="例: 資料検索時間50%削減、提案精度向上"
                    value={step1Data.expectedEffect}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, expectedEffect: e.target.value }))} />
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <p className="text-xs font-bold text-muted-foreground mb-3">任意項目（入力するとAIの精度が向上します）</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-sm"><Building2 className="w-3.5 h-3.5 text-muted-foreground" />関係部署</Label>
                    <Input placeholder="例: マーケティング部, カスタマーサポート部"
                      value={step1Data.relatedDepartments}
                      onChange={(e) => setStep1Data(prev => ({ ...prev, relatedDepartments: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-sm"><Hash className="w-3.5 h-3.5 text-muted-foreground" />数値根拠</Label>
                    <Input placeholder="例: 月20件の手戻り、年間100時間のロス"
                      value={step1Data.numericalEvidence}
                      onChange={(e) => setStep1Data(prev => ({ ...prev, numericalEvidence: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2" data-tour="generate-button">
                <Button onClick={handleGenerateDraft} disabled={!isStep1Valid() || isProcessing || !mePerson} className="gap-2">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  AIドラフトを生成する
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Steps 2-4: ローディング/編集/完了 */}
        {step === 2 && isProcessing && (
          <Card><CardContent className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">AIが構造化ドラフトを生成しています…</p>
          </CardContent></Card>
        )}

        {(step === 2 || step === 3) && editedDraft && !isProcessing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary" />
                Step{step}: AIドラフトを確認・修正
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <EditableField label="タイトル" value={editedDraft.title || ""} onChange={(v) => handleEditField("title", v)} />
              <EditableField label="問題" value={editedDraft.problem || ""} onChange={(v) => handleEditField("problem", v)} multiline />
              <EditableField label="原因" value={editedDraft.cause || ""} onChange={(v) => handleEditField("cause", v)} multiline />
              <EditableField label="解決策" value={editedDraft.solution || ""} onChange={(v) => handleEditField("solution", v)} multiline />
              <EditableField label="効果" value={editedDraft.effect || ""} onChange={(v) => handleEditField("effect", v)} multiline />
              <div className="grid grid-cols-2 gap-3">
                <EditableField label="部門" value={editedDraft.department || ""} onChange={(v) => handleEditField("department", v)} />
                <EditableField label="カテゴリ" value={editedDraft.category || ""} onChange={(v) => handleEditField("category", v)} />
              </div>
              <div className="flex justify-between gap-2 pt-3">
                <Button variant="outline" onClick={handleReset}>最初からやり直す</Button>
                <Button onClick={handleRegister} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  この内容で登録する
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card><CardContent className="py-10 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <p className="text-base font-medium">登録完了！</p>
            <Button variant="outline" onClick={handleReset}>もう1件入力する</Button>
          </CardContent></Card>
        )}

        {/* Recent submissions by me */}
        {recentItems.length > 0 && (
          <Card data-tour="recent-items">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />あなたの最近の登録</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recentItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate("/similar-cases")}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.department} ・ {item.createdAt}</p>
                  </div>
                  <Badge variant="outline" className="text-xs ml-2">影響度 {item.impactScore}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <SubmissionCompleteModal
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        impactScore={completionData.impactScore}
        xpGained={completionData.xpGained}
        oldLevel={completionData.oldLevel}
        newLevel={completionData.newLevel}
        completedMissions={completionData.completedMissions}
      />
    </main>
  );
};

const EditableField = ({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) => (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {multiline ? (
      <Textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="resize-none" />
    ) : (
      <Input value={value} onChange={e => onChange(e.target.value)} />
    )}
  </div>
);

export default KaizenInputPage;
