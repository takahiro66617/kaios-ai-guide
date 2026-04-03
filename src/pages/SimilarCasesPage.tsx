import { useState } from "react";
import { Search, FileText, ArrowRight, Sparkles, Tag, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface CaseItem {
  id: number;
  title: string;
  description: string;
  department: string;
  category: string;
  similarity: number;
  year: string;
}

const allCases: CaseItem[] = [
  { id: 1, title: "営業報告書の自動生成", description: "CRMデータから営業報告書を自動生成し、週次レポート作成の工数を80%削減した事例。", department: "営業部", category: "業務効率化", similarity: 92, year: "2025" },
  { id: 2, title: "製造ラインの予防保全システム", description: "IoTセンサーデータをAIで分析し、故障予測精度を向上。ダウンタイムを40%削減。", department: "製造部", category: "DX推進", similarity: 78, year: "2025" },
  { id: 3, title: "経費精算フローの電子化", description: "紙ベースの経費精算を完全電子化。承認リードタイムを3日→即日に短縮。", department: "経理部", category: "業務効率化", similarity: 85, year: "2024" },
  { id: 4, title: "顧客サポートのナレッジベース構築", description: "過去の問い合わせ内容をAIで分類し、検索可能なナレッジベースを構築。対応時間を30%短縮。", department: "カスタマーサポート", category: "ナレッジ管理", similarity: 88, year: "2025" },
  { id: 5, title: "会議室予約システムの最適化", description: "利用状況データから最適な会議室を自動提案。空き会議室の稼働率を25%改善。", department: "総務部", category: "可視化", similarity: 65, year: "2024" },
  { id: 6, title: "部門横断プロジェクト管理ツール導入", description: "複数部門で共有可能なプロジェクト管理ツールを導入し、情報共有のタイムラグを解消。", department: "経営企画部", category: "標準化", similarity: 71, year: "2026" },
];

const SimilarCasesPage = () => {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const results = searched
    ? allCases
        .filter(
          (c) =>
            query === "" ||
            c.title.includes(query) ||
            c.description.includes(query) ||
            c.category.includes(query) ||
            c.department.includes(query)
        )
        .sort((a, b) => b.similarity - a.similarity)
    : [];

  const handleSearch = () => {
    setSearched(true);
  };

  const getSimilarityColor = (v: number) => {
    if (v >= 85) return "bg-kaios-success/10 text-kaios-success border-kaios-success/20";
    if (v >= 70) return "bg-primary/10 text-primary border-primary/20";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" />
            類似事例を探す
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            過去の改善事例やナレッジからAIが類似度を計算し、参考になる事例を推薦します。
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="改善したいテーマやキーワードを入力（例：業務効率化、レポート自動化...）"
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} className="gap-1.5">
                <Search className="w-4 h-4" />
                検索
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {results.length}件の類似事例が見つかりました
            </p>
            {results.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                        <Badge variant="outline" className={getSimilarityColor(item.similarity)}>
                          類似度 {item.similarity}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {item.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {item.department}
                        </span>
                        <span>{item.year}年</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 gap-1">
                      詳細を見る
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!searched && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium mb-1">キーワードを入力して検索</p>
            <p className="text-sm">AIが過去のナレッジから類似事例を自動で探し出します。</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default SimilarCasesPage;
