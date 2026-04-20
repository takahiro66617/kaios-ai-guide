import { useState } from "react";
import { Sparkles, BookmarkPlus, ChevronRight, ArrowRight, TrendingUp, MapPin, BarChart3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useKaios, type Person, type KaizenItem } from "@/contexts/KaiosContext";
import { useNavigate } from "react-router-dom";

interface PersonDetailModalProps {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KaizenDetailView = ({ item, onBack }: { item: KaizenItem; onBack: () => void }) => {
  const { getPersonById } = useKaios();
  const author = getPersonById(item.authorId);

  const scoreColor = item.impactScore >= 70 ? "text-kaios-success" : item.impactScore >= 40 ? "text-primary" : "text-muted-foreground";
  const scoreBg = item.impactScore >= 70 ? "bg-kaios-success" : item.impactScore >= 40 ? "bg-primary" : "bg-muted-foreground";

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary hover:underline">
        ← 一覧に戻る
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{item.title}</h2>
        <Badge variant={item.executionStage === "実行済み" ? "default" : "secondary"}>{item.status}</Badge>
      </div>

      {/* Impact Score */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">インパクトスコア</span>
          </div>
          <span className={`text-3xl font-bold ${scoreColor}`}>{item.impactScore}<span className="text-sm font-normal text-muted-foreground">/100</span></span>
        </div>
        <Progress value={item.impactScore} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {item.impactScore >= 70 ? "高インパクト: 組織に大きな改善効果が期待されます" :
           item.impactScore >= 40 ? "中インパクト: 一定の改善効果が見込まれます" :
           "改善の余地あり: ウェイト調整や改善内容の見直しを検討してください"}
        </p>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <DetailField label="問題の内容" value={item.problem} />
        <DetailField label="原因仮説" value={item.cause} />
        <DetailField label="改善策" value={item.solution} />
        <DetailField label="期待効果" value={item.effect} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <DetailField label="部門" value={item.department} />
        <DetailField label="カテゴリ" value={item.category} />
        <DetailField label="再現性" value={item.reproducibility} />
      </div>

      {(item.occurrencePlace || item.frequency || item.numericalEvidence) && (
        <div className="grid grid-cols-3 gap-3">
          {item.occurrencePlace && <DetailField label="発生場所" value={item.occurrencePlace} />}
          {item.frequency && <DetailField label="頻度" value={item.frequency} />}
          {item.numericalEvidence && <DetailField label="数値根拠" value={item.numericalEvidence} />}
        </div>
      )}

      {/* Adoption */}
      <div className="rounded-lg border border-border p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          採用状況
        </h4>
        {item.adoptedBy.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {item.adoptedBy.map((dept, i) => (
              <Badge key={i} variant="outline">{dept}</Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">まだ他部署での採用はありません</p>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>提案者: {author?.name || "不明"}</span>
        <span>・</span>
        <span>登録日: {item.createdAt}</span>
        {item.tags.length > 0 && (
          <>
            <span>・</span>
            <span>タグ: {item.tags.join(", ")}</span>
          </>
        )}
      </div>
    </div>
  );
};

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-card p-3">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className="text-sm text-foreground">{value || "—"}</p>
  </div>
);

const PersonDetailModal = ({ person, open, onOpenChange }: PersonDetailModalProps) => {
  const { getKaizenByPerson, people } = useKaios();
  const navigate = useNavigate();
  const [selectedKaizen, setSelectedKaizen] = useState<KaizenItem | null>(null);

  if (!person) return null;

  const personKaizen = getKaizenByPerson(person.id);
  const completedKaizen = personKaizen.filter(k => k.executionStage === "実行済み");
  const inProgressKaizen = personKaizen.filter(k => k.executionStage === "実行予定");

  // Real: count total adoptions across all items
  const totalAdoptions = personKaizen.reduce((sum, k) => sum + k.adoptedBy.length, 0);

  // Real: unique departments that adopted
  const adoptedDepts = new Set(personKaizen.flatMap(k => k.adoptedBy));

  // Real: calculate actual consecutive months
  const sortedMonths = [...new Set(personKaizen.map(k => k.createdAt.slice(0, 7)))].sort();
  let consecutiveMonths = 0;
  if (sortedMonths.length > 0) {
    consecutiveMonths = 1;
    for (let i = sortedMonths.length - 1; i > 0; i--) {
      const [y1, m1] = sortedMonths[i].split("-").map(Number);
      const [y2, m2] = sortedMonths[i - 1].split("-").map(Number);
      const diff = (y1 * 12 + m1) - (y2 * 12 + m2);
      if (diff === 1) consecutiveMonths++;
      else break;
    }
  }

  // Real scores
  const avgScore = personKaizen.length > 0 ? Math.round(personKaizen.reduce((s, k) => s + k.impactScore, 0) / personKaizen.length) : 0;
  const maxScore = personKaizen.length > 0 ? Math.max(...personKaizen.map(k => k.impactScore)) : 0;
  const minScore = personKaizen.length > 0 ? Math.min(...personKaizen.map(k => k.impactScore)) : 0;
  const completionRate = personKaizen.length > 0 ? Math.round((completedKaizen.length / personKaizen.length) * 100) : 0;

  // Real: unique categories
  const categories = new Set(personKaizen.map(k => k.category));

  const getInsightText = () => {
    const strengths: string[] = [];
    if (totalAdoptions >= 3) strengths.push("横断影響と再利用性");
    if (completedKaizen.length >= 2) strengths.push("高い完了率");
    if (consecutiveMonths >= 2) strengths.push("継続的な改善行動");
    if (avgScore >= 60) strengths.push("高い平均インパクトスコア");
    if (strengths.length === 0) {
      return `${person.name}さんは改善活動に参加しています。提案数: ${personKaizen.length}件、平均スコア: ${avgScore}pt。`;
    }
    return `${person.name}さんは**${strengths.join("・")}**の観点で注目すべき人材です。${personKaizen.length}件の改善案を提出し、平均スコア${avgScore}ptを記録しています。`;
  };

  const topKaizen = [...personKaizen].sort((a, b) => b.impactScore - a.impactScore).slice(0, 5);

  const handleOpenChange = (v: boolean) => {
    if (!v) setSelectedKaizen(null);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{person.name}の詳細</DialogTitle>
        </DialogHeader>

        {selectedKaizen ? (
          <KaizenDetailView item={selectedKaizen} onBack={() => setSelectedKaizen(null)} />
        ) : (
          <>
            {/* Profile Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-16 h-16 rounded-full bg-kaios-warning-bg border-2 border-kaios-warning-border flex items-center justify-center text-xl font-bold text-kaios-warning-text">
                {person.avatarInitial}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">{person.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {person.department}　・　{person.role || "メンバー"}　・　入社{person.yearsAtCompany}年目
                </p>
              </div>
            </div>

            {/* Score Overview */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                <p className="text-2xl font-bold text-primary">{avgScore}<span className="text-xs font-normal">pt</span></p>
                <p className="text-xs text-muted-foreground">平均スコア</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{maxScore}<span className="text-xs font-normal text-muted-foreground">pt</span></p>
                <p className="text-xs text-muted-foreground">最高スコア</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{personKaizen.length}<span className="text-xs font-normal text-muted-foreground">件</span></p>
                <p className="text-xs text-muted-foreground">総提案数</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{completionRate}<span className="text-xs font-normal text-muted-foreground">%</span></p>
                <p className="text-xs text-muted-foreground">完了率</p>
              </div>
            </div>

            {/* AI Insight */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AIインサイト
              </h3>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-sm text-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: getInsightText().replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>')
                    }}
                  />
                </CardContent>
              </Card>

              {/* Real Stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard color="text-primary" label="他部署採用数" value={`${totalAdoptions}回`} sub={totalAdoptions > 0 ? `${adoptedDepts.size}部門で採用` : ""} description={totalAdoptions > 0 ? `採用先: ${[...adoptedDepts].slice(0, 3).join(", ")}${adoptedDepts.size > 3 ? " 他" : ""}` : "まだ他部署での採用なし"} />
                <StatCard color="text-kaios-success" label="カテゴリ範囲" value={`${categories.size}種類`} sub="" description={[...categories].slice(0, 3).join("・") || "—"} />
                <StatCard color="text-primary" label="継続改善" value={`${consecutiveMonths}か月`} sub={consecutiveMonths > 0 ? "連続提案" : ""} description={`全${sortedMonths.length}か月に提案あり（完了${completedKaizen.length}件・実行中${inProgressKaizen.length}件）`} />
              </div>
            </div>

            {/* Top Kaizen */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BookmarkPlus className="w-4 h-4 text-primary" />
                  改善案一覧（スコア順）
                </h3>
                <button
                  onClick={() => { handleOpenChange(false); navigate("/similar-cases"); }}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  すべての事例を見る <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {topKaizen.map((k) => {
                const scoreColor = k.impactScore >= 70 ? "text-kaios-success" : k.impactScore >= 40 ? "text-primary" : "text-muted-foreground";
                return (
                  <Card key={k.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedKaizen(k)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground">{k.title}</h4>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <Badge variant={k.executionStage === "実行済み" ? "default" : "outline"} className="text-xs">{k.status}</Badge>
                            <span>{k.department}</span>
                            <span>{k.createdAt}</span>
                            {k.adoptedBy.length > 0 && <span>採用: {k.adoptedBy.length}部署</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className={`text-lg font-bold ${scoreColor}`}>{k.impactScore}<span className="text-xs font-normal text-muted-foreground">pt</span></span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {topKaizen.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">改善案がまだありません</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const StatCard = ({ color, label, value, sub, description }: {
  color: string; label: string; value: string; sub: string; description: string;
}) => (
  <div className="rounded-lg border border-border bg-card p-3">
    <p className="text-xs text-muted-foreground flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full ${color === "text-primary" ? "bg-primary" : "bg-kaios-success"}`} />
      {label}
    </p>
    <p className={`text-2xl font-bold ${color} mt-1`}>
      {value}
      {sub && <span className="text-xs text-muted-foreground font-normal ml-1">{sub}</span>}
    </p>
    <p className="text-xs text-muted-foreground mt-1">{description}</p>
  </div>
);

export default PersonDetailModal;
