import { useMemo, useState } from "react";
import { Search, FileText, ArrowRight, Sparkles, Tag, Building2, User, Loader2, MessageSquare, Heart, Edit, Trash2, Save, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useKaios, type KaizenItem, type Person } from "@/contexts/KaiosContext";
import { useGuestProfile } from "@/contexts/GuestProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import PersonDetailModal from "@/components/kaios/PersonDetailModal";
import UITour, { type TourStep } from "@/components/kaios/UITour";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SIMILAR_TOUR_STEPS: TourStep[] = [
  { selector: '[data-tour="search-bar"]', title: "① 検索テーマを入力", description: "改善したいテーマや悩みを自由に入力します。", position: "bottom" },
  { selector: '[data-tour="search-button"]', title: "② AI検索を実行", description: "AIが承認済みナレッジから類似事例を推薦します。", position: "bottom" },
  { selector: '[data-tour="knowledge-base"]', title: "③ 承認済みナレッジ", description: "管理者が承認した正規ナレッジ一覧です。", position: "top" },
];

interface RankedItem extends KaizenItem {
  similarity: number;
  reason: string;
}

const SimilarCasesPage = () => {
  const { kaizenItems, getPersonById, editKaizenItem, deleteKaizenItem, updateAuthorNote } = useKaios();
  const { toggleLike, getLikeInfo } = useGuestProfile();
  const { isAdmin, user } = useAuth();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RankedItem[]>([]);
  const [searchSummary, setSearchSummary] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<KaizenItem | null>(null);
  const [editItem, setEditItem] = useState<KaizenItem | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<KaizenItem>>({});
  const [deleteTarget, setDeleteTarget] = useState<KaizenItem | null>(null);
  const [authorNoteDraft, setAuthorNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // 承認済みのみが正規ナレッジ
  const approvedItems = useMemo(() => kaizenItems.filter(k => k.status === "承認済み"), [kaizenItems]);
  const pendingItems = useMemo(() => kaizenItems.filter(k => k.status === "申請中"), [kaizenItems]);

  // 自分が著者かどうか判定（meのpeople行）
  const isOwner = (item: KaizenItem) => {
    // user.id と people.user_id の関係を介して判定。簡略化のため authorNameSnapshot 等で代替不可なので null チェック含めスキップ。
    // 編集導線は管理者のみ表示する仕様。
    return false;
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) { toast.error("検索クエリを入力してください"); return; }
    setIsSearching(true);
    setResults([]);
    setSearchSummary("");
    setSearched(true);
    try {
      const itemsForAI = approvedItems.map(item => ({
        title: item.title, problem: item.problem, solution: item.solution,
        effect: item.effect, category: item.category, department: item.department, tags: item.tags,
      }));
      const { data, error } = await supabase.functions.invoke("search-similar", {
        body: { query: q, items: itemsForAI },
      });
      if (error) throw new Error(error.message || "AI検索に失敗しました");
      if (data?.error) throw new Error(data.error);
      if (data?.rankings) {
        const ranked: RankedItem[] = data.rankings
          .filter((r: any) => r.similarity > 20 && r.index >= 0 && r.index < approvedItems.length)
          .sort((a: any, b: any) => b.similarity - a.similarity)
          .map((r: any) => ({ ...approvedItems[r.index], similarity: r.similarity, reason: r.reason }));
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
    if (person) { setSelectedPerson(person); setPersonModalOpen(true); }
  };

  const openEdit = (item: KaizenItem) => {
    setEditItem(item);
    setEditDraft({
      title: item.title, problem: item.problem, cause: item.cause,
      solution: item.solution, effect: item.effect, department: item.department,
      category: item.category, reproducibility: item.reproducibility,
    });
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    await editKaizenItem(editItem.id, editDraft);
    setEditItem(null);
    setDetailItem(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteKaizenItem(deleteTarget.id);
    setDeleteTarget(null);
    setDetailItem(null);
  };

  const openDetail = (item: KaizenItem) => {
    setDetailItem(item);
    setAuthorNoteDraft(item.authorNote || "");
  };

  const handleSaveAuthorNote = async () => {
    if (!detailItem) return;
    setSavingNote(true);
    await updateAuthorNote(detailItem.id, authorNoteDraft);
    setSavingNote(false);
    setDetailItem({ ...detailItem, authorNote: authorNoteDraft });
    toast.success("提案者メモを保存しました");
  };

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Search className="w-6 h-6 text-primary" />類似事例を探す
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理者が承認したナレッジから AI が類似事例を推薦します。
              <span className="text-primary ml-1">承認済み {approvedItems.length}件</span>
              {pendingItems.length > 0 && <span className="ml-2 text-amber-600">／ 申請中 {pendingItems.length}件</span>}
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
                  value={query} onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isSearching && handleSearch()}
                  placeholder="改善したいテーマや悩みを自由に入力" className="pl-9" disabled={isSearching}
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching || !query.trim()} className="gap-1.5" data-tour="search-button">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}AI検索
              </Button>
            </div>
          </CardContent>
        </Card>

        {isSearching && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">AI が類似事例を分析中...</p>
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
            <p className="text-sm text-muted-foreground">{results.length}件の類似事例</p>
            {results.map((item) => {
              const author = getPersonById(item.authorId);
              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                          <Badge variant="outline" className={getSimilarityColor(item.similarity)}>類似度 {item.similarity}%</Badge>
                          <Badge variant="secondary" className="text-xs">{item.status}</Badge>
                        </div>
                        <p className="text-sm text-primary/80 mb-1 italic">💡 {item.reason}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.solution}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{item.category}</span>
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{item.department}</span>
                          <span>{item.createdAt}</span>
                          {author && (
                            <button onClick={() => handlePersonClick(item.authorId)} className="flex items-center gap-1 text-primary hover:underline">
                              <User className="w-3 h-3" />{author.name}
                            </button>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => openDetail(item)}>
                        詳細を見る<ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 未承認候補（申請中）— 管理者にのみ可視 */}
        {isAdmin && pendingItems.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-600" />
              未承認候補（申請中）
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">{pendingItems.length}件</Badge>
            </h2>
            <p className="text-xs text-muted-foreground">管理者ダッシュボードから承認・差戻しを行えます。</p>
            {pendingItems.map(item => {
              const author = getPersonById(item.authorId);
              return (
                <Card key={item.id} className="border-amber-200 bg-amber-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                          <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">申請中</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.problem}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{item.department}</span>
                          {author && <span>{author.name}</span>}
                          <span>{item.createdAt}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openDetail(item)}>詳細</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 承認済みナレッジ一覧 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between" data-tour="knowledge-base">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />承認済みナレッジ
              <Badge variant="secondary" className="text-xs">{approvedItems.length}件</Badge>
            </h2>
          </div>
          {approvedItems.length > 0 ? (
            approvedItems.map((item) => {
              const author = getPersonById(item.authorId);
              const likeInfo = getLikeInfo(item.id);
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
                            <button onClick={() => handlePersonClick(item.authorId)} className="flex items-center gap-1 text-primary hover:underline">
                              <User className="w-3 h-3" />{author.name}
                            </button>
                          )}
                          {item.adoptedBy.length > 0 && <span className="text-kaios-success">{item.adoptedBy.length}部門で採用</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleLike(item.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                            likeInfo.likedByMe ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${likeInfo.likedByMe ? "fill-current" : ""}`} />
                          {likeInfo.count > 0 && likeInfo.count}
                        </button>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => openDetail(item)}>
                          詳細<ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">承認済みナレッジはまだありません。</p>
            </div>
          )}
        </div>
      </div>

      <PersonDetailModal person={selectedPerson} open={personModalOpen} onOpenChange={setPersonModalOpen} />

      {/* Detail dialog */}
      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailItem?.title}</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
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
                {detailItem.tags.map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)}
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

              {/* 提案者メモ（管理者と本人のみがDB上閲覧可、ここでは編集UIを管理者と推定本人に出す。簡略化のため誰でも閲覧、編集可能なのは管理者か） */}
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <label className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" />提案者メモ
                </label>
                <Textarea
                  value={authorNoteDraft}
                  onChange={(e) => setAuthorNoteDraft(e.target.value)}
                  rows={2}
                  placeholder="補足や続報があれば記入"
                />
                <Button size="sm" variant="outline" className="mt-2" onClick={handleSaveAuthorNote} disabled={savingNote}>
                  <Save className="w-3 h-3 mr-1" />{savingNote ? "保存中..." : "提案者メモを保存"}
                </Button>
              </div>

              {detailItem.adminMemo && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">管理者メモ</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{detailItem.adminMemo}</p>
                </div>
              )}
            </div>
          )}
          {detailItem && isAdmin && (
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(detailItem)}>
                <Trash2 className="w-4 h-4 mr-1" />削除
              </Button>
              <Button variant="outline" size="sm" onClick={() => openEdit(detailItem)}>
                <Edit className="w-4 h-4 mr-1" />編集
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ナレッジを編集</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <Input value={editDraft.title || ""} onChange={(e) => setEditDraft(d => ({ ...d, title: e.target.value }))} placeholder="タイトル" />
              <Textarea value={editDraft.problem || ""} onChange={(e) => setEditDraft(d => ({ ...d, problem: e.target.value }))} placeholder="課題" rows={2} />
              <Textarea value={editDraft.cause || ""} onChange={(e) => setEditDraft(d => ({ ...d, cause: e.target.value }))} placeholder="原因" rows={2} />
              <Textarea value={editDraft.solution || ""} onChange={(e) => setEditDraft(d => ({ ...d, solution: e.target.value }))} placeholder="解決策" rows={2} />
              <Textarea value={editDraft.effect || ""} onChange={(e) => setEditDraft(d => ({ ...d, effect: e.target.value }))} placeholder="効果" rows={2} />
              <div className="grid grid-cols-2 gap-2">
                <Input value={editDraft.department || ""} onChange={(e) => setEditDraft(d => ({ ...d, department: e.target.value }))} placeholder="部門" />
                <Input value={editDraft.category || ""} onChange={(e) => setEditDraft(d => ({ ...d, category: e.target.value }))} placeholder="カテゴリ" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>キャンセル</Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>このナレッジを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              ナレッジから削除されます。履歴は残りません。元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-muted/30 p-3">
    <p className="text-xs font-bold text-muted-foreground mb-1">{label}</p>
    <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
  </div>
);

export default SimilarCasesPage;
