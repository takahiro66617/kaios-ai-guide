import { BarChart3, TrendingUp, Users, Zap, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

const departmentData = [
  { name: "営業部", count: 24, impact: 78 },
  { name: "製造部", count: 18, impact: 85 },
  { name: "物流部", count: 12, impact: 62 },
  { name: "経理部", count: 9, impact: 55 },
  { name: "情報システム部", count: 15, impact: 90 },
  { name: "総務部", count: 7, impact: 40 },
];

const categoryData = [
  { name: "業務効率化", value: 35 },
  { name: "DX推進", value: 25 },
  { name: "標準化", value: 18 },
  { name: "可視化", value: 12 },
  { name: "その他", value: 10 },
];

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(48, 96%, 53%)",
  "hsl(280, 65%, 60%)",
  "hsl(215, 16%, 47%)",
];

const topContributors = [
  { name: "田中 花子", dept: "情報システム部", count: 8, score: 95 },
  { name: "佐藤 一郎", dept: "製造部", count: 6, score: 88 },
  { name: "鈴木 次郎", dept: "営業部", count: 5, score: 82 },
  { name: "高橋 美咲", dept: "経営企画部", count: 4, score: 79 },
];

const ImpactPage = () => {
  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            インパクトの見える化
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            改善活動が組織に与えるインパクトを多角的に可視化します。
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Zap} label="総改善案数" value="85" sub="+12 今月" />
          <KpiCard icon={TrendingUp} label="平均インパクトスコア" value="72%" sub="+5% 前月比" />
          <KpiCard icon={Users} label="参加部門数" value="6 / 8" sub="部門" />
          <KpiCard icon={Award} label="実行完了率" value="64%" sub="54件完了" />
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
                  <Bar dataKey="impact" name="スコア" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
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

        {/* Top Contributors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              トップ貢献者
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topContributors.map((person, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm font-medium text-foreground">{person.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{person.dept}</span>
                      </div>
                      <span className="text-sm font-bold text-primary">{person.score}pt</span>
                    </div>
                    <Progress value={person.score} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
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
