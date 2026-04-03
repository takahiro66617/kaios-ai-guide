import { Sparkles, MessageSquare, BookmarkPlus, ChevronRight, Building2, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useKaios, type Person } from "@/contexts/KaiosContext";
import { useNavigate } from "react-router-dom";

interface PersonDetailModalProps {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PersonDetailModal = ({ person, open, onOpenChange }: PersonDetailModalProps) => {
  const { getKaizenByPerson, kaizenItems } = useKaios();
  const navigate = useNavigate();

  if (!person) return null;

  const personKaizen = getKaizenByPerson(person.id);
  const completedKaizen = personKaizen.filter(k => k.status === "完了");

  // Calculate cross-department adoption count
  const totalAdoptions = personKaizen.reduce((sum, k) => sum + k.adoptedBy.length, 0);

  // Departments that adopted this person's improvements
  const adoptedDepts = new Set(personKaizen.flatMap(k => k.adoptedBy));

  // Continuous improvement: count months with at least one submission
  const months = new Set(personKaizen.map(k => k.createdAt.slice(0, 7)));
  const continuousMonths = months.size;

  // AI insight text
  const getInsightText = () => {
    const strengths: string[] = [];
    if (totalAdoptions >= 3) strengths.push("横断影響と再利用性");
    if (completedKaizen.length >= 3) strengths.push("高い完了率");
    if (continuousMonths >= 3) strengths.push("継続的な改善行動");

    if (strengths.length === 0) {
      return `${person.name.split(" ")[0]}さんは改善活動に積極的に参加しています。今後の改善案の提出と実行が期待されます。`;
    }

    return `${person.name.split(" ")[0]}さんは、改善案の横展開と継続的な採用実績の観点で、追加的に注目すべき人材です。既存評価（自部署のKPI達成度中心）とは異なる軸として、**${strengths.join("と")}**で極めて高い示唆が見られます。`;
  };

  // Top kaizen items (sorted by impact)
  const topKaizen = [...personKaizen].sort((a, b) => b.impactScore - a.impactScore).slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{person.name}の詳細</DialogTitle>
        </DialogHeader>

        {/* Profile Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="w-16 h-16 rounded-full bg-kaios-warning-bg border-2 border-kaios-warning-border flex items-center justify-center text-xl font-bold text-kaios-warning-text">
            {person.avatarInitial}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{person.name}</h2>
            <p className="text-sm text-muted-foreground">
              {person.department}　・　入社{person.yearsAtCompany}年目
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <MessageSquare className="w-4 h-4" />
              1on1の話題を作る
            </Button>
            <Button size="sm" className="gap-1.5">
              <BookmarkPlus className="w-4 h-4" />
              育成メモを保存
            </Button>
          </div>
        </div>

        {/* AI Insight */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            なぜ注目か (AIインサイト)
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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              color="text-primary"
              label="他部署採用回数"
              value={`${totalAdoptions}回`}
              sub="/ 過去半年"
              description="提案が個人内で完結せず、複数部門で再利用されている"
            />
            <StatCard
              color="text-kaios-success"
              label="対象範囲"
              value={`${adoptedDepts.size}部門`}
              sub=""
              description="特定チームに閉じない横断性が確認できる"
            />
            <StatCard
              color="text-primary"
              label="継続改善"
              value={`${continuousMonths}か月連続`}
              sub=""
              description="一発の成功ではなく、継続的な改善行動が見られる"
            />
          </div>
        </div>

        {/* Top Kaizen */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-primary" />
              根拠事例 (トップ採用された改善)
            </h3>
            <button
              onClick={() => { onOpenChange(false); navigate("/similar-cases"); }}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              すべての事例を見る
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {topKaizen.map((k) => (
            <Card key={k.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{k.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{k.createdAt.slice(0, 7).replace("-", "年")}月</Badge>
                      <span>採用部署: {k.adoptedBy.length > 0 ? k.adoptedBy.join(", ") : "なし"}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StatCard = ({ color, label, value, sub, description }: {
  color: string;
  label: string;
  value: string;
  sub: string;
  description: string;
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
