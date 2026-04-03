import { useState } from "react";
import { Search, FileText, ArrowRight, Sparkles, Tag, Building2, User, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useKaios, type KaizenItem, type Person } from "@/contexts/KaiosContext";
import PersonDetailModal from "@/components/kaios/PersonDetailModal";
import UITour, { type TourStep } from "@/components/kaios/UITour";

const SIMILAR_TOUR_STEPS: TourStep[] = [
  { selector: '[data-tour="search-bar"]', title: "① 検索テーマを入力", description: "改善したいテーマや悩みを自由に入力します。キーワードでも文章でもOK。", position: "bottom" },
  { selector: '[data-tour="search-button"]', title: "② AI検索を実行", description: "AIがナレッジベース全体と意味的な類似度を分析し、関連する事例を推薦します。", position: "bottom" },
  { selector: '[data-tour="knowledge-base"]', title: "③ 登録済みナレッジ", description: "登録された全改善事例が一覧表示されています。「詳細」で全情報を確認できます。", position: "top" },
];
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RankedItem extends KaizenItem {
  similarity: number;
  reason: string;
}

const SimilarCasesPage = () => {
  const { kaizenItems, getPersonById } = useKaios();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RankedItem[]>([]);
  const [searchSummary, setSearchSummary] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<KaizenItem | null>(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) { toast.error("検索クエリを入力してください"); return; }

    setIsSearching(true);
    setResults([]);
    setSearchSummary("");
    setSearched(true);

    try {
      // Send items summary to AI for semantic ranking
      const itemsForAI = kaizenItems.map(item => ({
        title: item.title,
        problem: item.problem,
        solution: item.solution,
        effect: item.effect,
        category: item.category,
        department: item.department,
        tags: item.tags,
      }));

      const { data, error } = await supabase.functions.invoke("search-similar", {
        body: { query: q, items: itemsForAI },
      });

      if (error) throw new Error(error.message || "AI検索に失敗しました");
      if (data?.error) throw new Error(data.error);

      if (data?.rankings) {
        const ranked: RankedItem[] = data.rankings
          .filter((r: any) => r.similarity > 20 && r.index >= 0 && r.index < kaizenItems.length)
          .sort((a: any, b: any) => b.similarity - a.similarity)
          .map((r: any) => ({
            ...kaizenItems[r.index],
            similarity: r.similarity,
            reason: r.reason,
          }));

        setResults(ranked);
        setSearchSummary(data.summary || "");
        toast.success(`AIが${ranked.length}件の類似事例を見つけました`);
      }
    } catch (e: any) {
      console.error("Search error:", e);
      toast.error(e.message || "AI検索中にエラーが発生しました");
    } finally {
      setIsSearching(false);
    }
  };

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Search className="w-6 h-6 text-primary" />
              類似事例を探す
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              ナレッジベースに登録された改善事例からAIが意味的な類似度を分析し、参考になる事例を推薦します。
              <span className="text-primary ml-1">現在 {kaizenItems.length}件</span> の事例が登録されています。
            </p>
          </div>
          <UITour steps={SIMILAR_TOUR_STEPS} tourKey="similar-cases" />
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="relative flex-1" data-tour="search-bar">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isSearching && handleSearch()}
                  placeholder="改善したいテーマや悩みを自由に入力（例：作業が属人化している、手作業が多い、情報が散在...）"
                  className="pl-9"
                  disabled={isSearching}
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching || !query.trim()} className="gap-1.5" data-tour="search-button">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                AI検索
              </Button>
            </div>
          </CardContent>
        </Card>

        {isSearching && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">AIがナレッジベースから類似事例を分析中...</p>
          </div>
        )}

        {searched && !isSearching && (
          <div className="space-y-4">
            {searchSummary && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-primary mb-1">AIサマリー</p>
                    <p className="text-sm text-foreground">{searchSummary}</p>
                  </div>
                </CardContent>
              </Card>
            )}

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
                        <p className="text-sm text-primary/80 mb-1 italic">💡 {item.reason}</p>
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

            {results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">関連する事例が見つかりませんでした。別のキーワードでお試しください。</p>
              </div>
            )}
          </div>
        )}

        {/* Knowledge Base - always visible */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              登録済みナレッジベース
              <Badge variant="secondary" className="text-xs">{kaizenItems.length}件</Badge>
            </h2>
          </div>

          {kaizenItems.length > 0 ? (
            kaizenItems.map((item) => {
              const author = getPersonById(item.authorId);
              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                          <Badge variant="secondary" className="text-xs">{item.status}</Badge>
                          <span className="text-xs font-bold text-primary">{item.impactScore}pt</span>
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
                        詳細
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">ナレッジがまだ登録されていません。</p>
              <p className="text-xs mt-1">「改善入力と整理」ページから改善案を登録してください。</p>
            </div>
          )}
        </div>
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
                {detailItem.occurrencePlace && <Field label="📍 発生場所" value={detailItem.occurrencePlace} />}
                {detailItem.frequency && <Field label="🔄 頻度" value={detailItem.frequency} />}
                {detailItem.numericalEvidence && <Field label="📊 数値根拠" value={detailItem.numericalEvidence} />}
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
