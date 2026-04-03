import { useState, useMemo } from "react";
import { BarChart3, TrendingUp, Users, Zap, Award, User, ArrowRight, Settings, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useKaios, type Person } from "@/contexts/KaiosContext";
import PersonDetailModal from "@/components/kaios/PersonDetailModal";
import { useNavigate } from "react-router-dom";

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(48, 96%, 53%)",
  "hsl(280, 65%, 60%)",
  "hsl(215, 16%, 47%)",
  "hsl(0, 84%, 60%)",
  "hsl(190, 80%, 45%)",
];

const ImpactPage = () => {
  const { kaizenItems, people, getKaizenByPerson, evalSettings, calculateImpactScore } = useKaios();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const navigate = useNavigate();

  // Compute real stats from shared data
  const totalItems = kaizenItems.length;
  const completedItems = kaizenItems.filter(k => k.status === "完了").length;
  const avgImpact = totalItems > 0 ? Math.round(kaizenItems.reduce((s, k) => s + calculateImpactScore(k), 0) / totalItems) : 0;
  const activeDepts = new Set(kaizenItems.map(k => k.department));
  const thisMonthItems = kaizenItems.filter(k => k.createdAt >= "2026-03-01").length;

  // Department data - computed from real items
  const departmentData = useMemo(() => {
    const deptMap = new Map<string, { count: number; totalImpact: number }>();
    kaizenItems.forEach(k => {
      const existing = deptMap.get(k.department) || { count: 0, totalImpact: 0 };
      existing.count++;
      existing.totalImpact += calculateImpactScore(k);
      deptMap.set(k.department, existing);
    });
    return Array.from(deptMap.entries()).map(([name, data]) => ({
      name: name.replace("部", ""),
      count: data.count,
      impact: Math.round(data.totalImpact / data.count),
    })).sort((a, b) => b.count - a.count);
  }, [kaizenItems, calculateImpactScore]);

  // Category data - computed from real items
  const categoryData = useMemo(() => {
    const catMap = new Map<string, number>();
    kaizenItems.forEach(k => catMap.set(k.category, (catMap.get(k.category) || 0) + 1));
    return Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value: Math.round((value / totalItems) * 100) }))
      .sort((a, b) => b.value - a.value);
  }, [kaizenItems, totalItems]);

  // Top contributors - computed from real people & items
  const topContributors = useMemo(() => {
    return people.map(p => {
      const items = getKaizenByPerson(p.id);
      const totalAdoptions = items.reduce((s, k) => s + k.adoptedBy.length, 0);
      const avgScore = items.length > 0
        ? Math.round(items.reduce((s, k) => s + calculateImpactScore(k), 0) / items.length)
        : 0;
      return {
        person: p,
        count: items.length,
        score: avgScore,
        adoptions: totalAdoptions,
        completed: items.filter(k => k.status === "完了").length,
      };
    })
    .filter(c => c.count > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  }, [people, getKaizenByPerson, calculateImpactScore]);

  // Recent high-impact items
  const highImpactItems = useMemo(() => {
    return [...kaizenItems]
      .sort((a, b) => calculateImpactScore(b) - calculateImpactScore(a))
      .slice(0, 5);
  }, [kaizenItems, calculateImpactScore]);

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
    setPersonModalOpen(true);
  };

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              インパクトの見える化
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              改善活動が組織に与えるインパクトをリアルタイムで可視化します。
              評価方針設定（Speed: {evalSettings.speed}%, Cross-functional: {evalSettings.crossFunctional}%）に基づいてスコアが計算されます。
            </p>
          </div>
        </div>

        {/* KPI Cards - all from real data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Zap} label="総改善案数" value={String(totalItems)} sub={`+${thisMonthItems} 今月`} />
          <KpiCard icon={TrendingUp} label="平均インパクトスコア" value={`${avgImpact}%`} sub="評価方針に連動" />
          <KpiCard icon={Users} label="参加部門数" value={`${activeDepts.size}部門`} sub={`${people.length}名参加`} />
          <KpiCard icon={Award} label="実行完了率" value={`${totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0}%`} sub={`${completedItems}件完了`} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">部門別 改善件数とインパクトスコア</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="件数" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="impact" name="平均スコア" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">カテゴリ別 改善案の分布</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value}%)`}
                  >
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Contributors - clickable to person detail */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                トップ貢献者
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topContributors.map((c, i) => (
                  <button
                    key={c.person.id}
                    onClick={() => handlePersonClick(c.person)}
                    className="w-full flex items-center gap-4 hover:bg-muted/50 rounded-lg p-1 -m-1 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                      {c.person.avatarInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{c.person.name}</span>
                          <span className="text-xs text-muted-foreground">{c.person.department}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{c.count}件</span>
                          <span className="text-sm font-bold text-primary">{c.score}pt</span>
                        </div>
                      </div>
                      <Progress value={c.score} className="h-2" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* High Impact Items - linked to similar cases */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                高インパクト改善案
              </CardTitle>
              <button
                onClick={() => navigate("/similar-cases")}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                すべて見る
                <ArrowRight className="w-3 h-3" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {highImpactItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-foreground truncate">{item.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>{item.department}</span>
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        {item.adoptedBy.length > 0 && (
                          <span className="text-kaios-success">{item.adoptedBy.length}部門採用</span>
                        )}
                      </div>
                    </div>
                    <span className="text-lg font-bold text-primary ml-3">{calculateImpactScore(item)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PersonDetailModal person={selectedPerson} open={personModalOpen} onOpenChange={setPersonModalOpen} />
    </main>
  );
};

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}

const KpiCard = ({ icon: Icon, label, value, sub }: KpiCardProps) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default ImpactPage;
