import { useState } from "react";
import { Search, FileText, ArrowRight, Sparkles, Tag, Building2, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useKaios, type KaizenItem, type Person } from "@/contexts/KaiosContext";
import PersonDetailModal from "@/components/kaios/PersonDetailModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SimilarCasesPage = () => {
  const { kaizenItems, getPersonById, evalSettings } = useKaios();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<KaizenItem | null>(null);

  const calculateSimilarity = (item: KaizenItem, q: string): number => {
    if (!q) return item.impactScore;
    const text = `${item.title} ${item.problem} ${item.solution} ${item.effect} ${item.tags.join(" ")} ${item.category} ${item.department}`.toLowerCase();
    const terms = q.toLowerCase().split(/\s+/);
    let matches = 0;
    terms.forEach(t => { if (text.includes(t)) matches++; });
    const matchRatio = terms.length > 0 ? matches / terms.length : 0;
    return Math.min(100, Math.round(matchRatio * 60 + item.impactScore * 0.4));
  };

  const results = searched
    ? kaizenItems
        .map(item => ({ ...item, similarity: calculateSimilarity(item, query) }))
        .filter(item => item.similarity > 30)
        .sort((a, b) => b.similarity - a.similarity)
    : [];

  const handleSearch = () => setSearched(true);

  const getSimilarityColor = (v: number) => {
    if (v >= 80) return "bg-kaios-success/10 text-kaios-success border-kaios-success/20";
    if (v >= 60) return "bg-primary/10 text-primary border-primary/20";
    return "bg-muted text-muted-foreground border-border";
  };

  const handlePersonClick = (authorId: string) => {
    const person = getPersonById(authorId);
    if (person) {
      setSelectedPerson(person);
      setPersonModalOpen(true);
    }
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
            ナレッジベースに登録された改善事例からAIが類似度を計算し、参考になる事例を推薦します。
            <span className="text-primary ml-1">現在 {kaizenItems.length}件</span> の事例が登録されています。
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="改善したいテーマやキーワードを入力（例：自動化、テンプレート、属人化解消...）"
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

        {searched && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {results.length}件の類似事例が見つかりました
              {query && <span className="text-primary ml-1">「{query}」</span>}
            </p>
            {results.map((item) => {
              const author = getPersonById(item.authorId);
              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                          <Badge variant="outline" className={getSimilarityColor(item.similarity)}>
                            類似度 {item.similarity}%
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{item.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.solution}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{item.category}</span>
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{item.department}</span>
                          <span>{item.createdAt}</span>
                          {author && (
                            <button
                              onClick={() => handlePersonClick(item.authorId)}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <User className="w-3 h-3" />
                              {author.name}
                            </button>
                          )}
                          {item.adoptedBy.length > 0 && (
                            <span className="text-kaios-success">
                              {item.adoptedBy.length}部門で採用
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => setDetailItem(item)}>
                        詳細を見る
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!searched && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium mb-1">キーワードを入力して検索</p>
            <p className="text-sm">ナレッジベースからAIが類似事例を自動で探し出します。</p>
          </div>
        )}
      </div>

      <PersonDetailModal person={selectedPerson} open={personModalOpen} onOpenChange={setPersonModalOpen} />

      {/* Kaizen Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailItem?.title}</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{detailItem.category}</Badge>
                <span>{detailItem.department}</span>
                <span>{detailItem.createdAt}</span>
                <Badge variant="secondary">{detailItem.status}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Field label="🔴 課題" value={detailItem.problem} />
                <Field label="🔍 原因" value={detailItem.cause} />
                <Field label="💡 解決策" value={detailItem.solution} />
                <Field label="📈 効果" value={detailItem.effect} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detailItem.tags.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
              {detailItem.adoptedBy.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-foreground">採用部門: </span>
                  <span className="text-muted-foreground">{detailItem.adoptedBy.join(", ")}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">インパクトスコア:</span>
                <span className="text-primary font-bold">{detailItem.impactScore}点</span>
                <span className="font-medium text-foreground ml-4">再現性:</span>
                <Badge variant="outline">{detailItem.reproducibility}</Badge>
              </div>
              {(() => {
                const author = getPersonById(detailItem.authorId);
                return author ? (
                  <button
                    onClick={() => { setDetailItem(null); handlePersonClick(detailItem.authorId); }}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <User className="w-4 h-4" />
                    提案者: {author.name}（{author.department}）
                  </button>
                ) : null;
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-muted/30 p-3">
    <p className="text-xs font-bold text-muted-foreground mb-1">{label}</p>
    <p className="text-sm text-foreground">{value}</p>
  </div>
);

export default SimilarCasesPage;
