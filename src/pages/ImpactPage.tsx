import { useState, useMemo } from "react";
import { BarChart3, TrendingUp, Users, Zap, Award, User, ArrowRight, Settings, Sparkles, Filter, Calendar, Building2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import UITour, { type TourStep } from "@/components/kaios/UITour";

const IMPACT_TOUR_STEPS: TourStep[] = [
  { selector: '[data-tour="eval-banner"]', title: "① 評価方針バナー", description: "現在のAI評価ウェイト（5軸）が表示されています。「評価方針を変更」でウェイトを調整できます。", position: "bottom" },
  { selector: '[data-tour="filter-bar"]', title: "② フィルター", description: "部門、期間、ステータス、ソートで表示データを絞り込めます。全てのグラフ・統計が連動します。", position: "bottom" },
  { selector: '[data-tour="kpi-cards"]', title: "③ KPI概要", description: "総改善案数、平均スコア、参加部門数、完了率が一目で確認できます。", position: "bottom" },
  { selector: '[data-tour="charts"]', title: "④ グラフ分析", description: "部門別の改善件数・スコアの棒グラフ、カテゴリ分布の円グラフで傾向を把握します。", position: "top" },
  { selector: '[data-tour="top-contributors"]', title: "⑤ トップ貢献者", description: "スコアの高い改善案を出している人物のランキング。クリックで詳細確認できます。", position: "right" },
];

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(48, 96%, 53%)",
  "hsl(280, 65%, 60%)",
  "hsl(215, 16%, 47%)",
  "hsl(0, 84%, 60%)",
  "hsl(190, 80%, 45%)",
];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "全期間" },
  { value: "1m", label: "直近1ヶ月" },
  { value: "3m", label: "直近3ヶ月" },
  { value: "6m", label: "直近6ヶ月" },
  { value: "1y", label: "直近1年" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "全ステータス" },
  { value: "構造化済み", label: "構造化済み" },
  { value: "ナレッジ登録済み", label: "ナレッジ登録済み" },
  { value: "実行中", label: "実行中" },
  { value: "完了", label: "完了" },
];

const SORT_OPTIONS = [
  { value: "score-desc", label: "スコア高い順" },
  { value: "score-asc", label: "スコア低い順" },
  { value: "count-desc", label: "件数多い順" },
  { value: "date-desc", label: "新しい順" },
];

const ImpactPage = () => {
  const { kaizenItems, people, getKaizenByPerson, evalAxes } = useKaios();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const navigate = useNavigate();

  // Filter states
  const [deptFilter, setDeptFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score-desc");

  // Get unique departments from data
  const allDepartments = useMemo(() => {
    const depts = new Set(kaizenItems.map(k => k.department));
    return Array.from(depts).sort();
  }, [kaizenItems]);

  // Apply filters
  const filteredItems = useMemo(() => {
    let items = [...kaizenItems];

    if (deptFilter !== "all") {
      items = items.filter(k => k.department === deptFilter);
    }
    if (statusFilter !== "all") {
      items = items.filter(k => k.status === statusFilter);
    }
    if (dateRange !== "all") {
      const now = new Date();
      const months = dateRange === "1m" ? 1 : dateRange === "3m" ? 3 : dateRange === "6m" ? 6 : 12;
      const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate()).toISOString().slice(0, 10);
      items = items.filter(k => k.createdAt >= cutoff);
    }

    return items;
  }, [kaizenItems, deptFilter, statusFilter, dateRange]);

  const hasActiveFilters = deptFilter !== "all" || dateRange !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setDeptFilter("all");
    setDateRange("all");
    setStatusFilter("all");
  };

  // Compute stats from filtered data
  const totalItems = filteredItems.length;
  const completedItems = filteredItems.filter(k => k.status === "完了").length;
  const avgImpact = totalItems > 0 ? Math.round(filteredItems.reduce((s, k) => s + k.impactScore, 0) / totalItems) : 0;
  const activeDepts = new Set(filteredItems.map(k => k.department));
  const thisMonthItems = filteredItems.filter(k => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return k.createdAt.startsWith(monthStr);
  }).length;

  // Department data
  const departmentData = useMemo(() => {
    const deptMap = new Map<string, { count: number; totalImpact: number }>();
    filteredItems.forEach(k => {
      const existing = deptMap.get(k.department) || { count: 0, totalImpact: 0 };
      existing.count++;
      existing.totalImpact += k.impactScore;
      deptMap.set(k.department, existing);
    });
    return Array.from(deptMap.entries()).map(([name, data]) => ({
      name: name.replace("部", ""),
      count: data.count,
      impact: Math.round(data.totalImpact / data.count),
    })).sort((a, b) => b.count - a.count);
  }, [filteredItems]);

  // Category data
  const categoryData = useMemo(() => {
    const catMap = new Map<string, number>();
    filteredItems.forEach(k => catMap.set(k.category, (catMap.get(k.category) || 0) + 1));
    return Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value: totalItems > 0 ? Math.round((value / totalItems) * 100) : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [filteredItems, totalItems]);

  // Top contributors from filtered data
  const topContributors = useMemo(() => {
    const personMap = new Map<string, { count: number; totalScore: number; adoptions: number; completed: number }>();
    filteredItems.forEach(k => {
      const existing = personMap.get(k.authorId) || { count: 0, totalScore: 0, adoptions: 0, completed: 0 };
      existing.count++;
      existing.totalScore += k.impactScore;
      existing.adoptions += k.adoptedBy.length;
      if (k.status === "完了") existing.completed++;
      personMap.set(k.authorId, existing);
    });

    return Array.from(personMap.entries())
      .map(([personId, data]) => {
        const person = people.find(p => p.id === personId);
        if (!person) return null;
        return {
          person,
          count: data.count,
          score: Math.round(data.totalScore / data.count),
          adoptions: data.adoptions,
          completed: data.completed,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (sortBy === "score-asc") return a!.score - b!.score;
        if (sortBy === "count-desc") return b!.count - a!.count;
        return b!.score - a!.score;
      })
      .slice(0, 8) as { person: Person; count: number; score: number; adoptions: number; completed: number }[];
  }, [filteredItems, people, sortBy]);

  // High impact items
  const highImpactItems = useMemo(() => {
    return [...filteredItems]
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 5);
  }, [filteredItems]);

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
    setPersonModalOpen(true);
  };

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              インパクトの見える化
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              改善活動が組織に与えるインパクトをリアルタイムで可視化します。
            </p>
          </div>
          <UITour steps={IMPACT_TOUR_STEPS} tourKey="impact" />
        </div>

        {/* Filter Bar */}
        <Card data-tour="filter-bar">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Filter className="w-4 h-4 text-muted-foreground" />
                絞り込み:
              </div>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <Building2 className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部門</SelectItem>
                  {allDepartments.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[150px] h-9">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-9" onClick={clearFilters}>
                  <X className="w-3 h-3" />
                  フィルタをクリア
                </Button>
              )}
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-xs">
                  {totalItems}件表示中 / 全{kaizenItems.length}件
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-tour="kpi-cards">
          <KpiCard icon={Zap} label="総改善案数" value={String(totalItems)} sub={`+${thisMonthItems} 今月`} />
          <KpiCard icon={TrendingUp} label="平均インパクトスコア" value={`${avgImpact}%`} sub="評価方針に連動" />
          <KpiCard icon={Users} label="参加部門数" value={`${activeDepts.size}部門`} sub={`${people.length}名登録`} />
          <KpiCard icon={Award} label="実行完了率" value={`${totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0}%`} sub={`${completedItems}件完了`} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-tour="charts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">部門別 改善件数とインパクトスコア</CardTitle>
            </CardHeader>
            <CardContent>
              {departmentData.length > 0 ? (
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
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">フィルタ条件に該当するデータがありません</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">カテゴリ別 改善案の分布</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
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
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">フィルタ条件に該当するデータがありません</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Contributors */}
          <Card data-tour="top-contributors">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                トップ貢献者
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topContributors.length > 0 ? topContributors.map((c) => (
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
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">該当する貢献者がいません</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* High Impact Items */}
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
                {highImpactItems.length > 0 ? highImpactItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-foreground truncate">{item.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>{item.department}</span>
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        <Badge variant="secondary" className="text-xs">{item.status}</Badge>
                        {item.adoptedBy.length > 0 && (
                          <span className="text-kaios-success">{item.adoptedBy.length}部門採用</span>
                        )}
                      </div>
                    </div>
                    <span className="text-lg font-bold text-primary ml-3">{item.impactScore}</span>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">該当する改善案がありません</p>
                )}
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
