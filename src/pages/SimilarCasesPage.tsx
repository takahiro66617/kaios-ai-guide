import { useMemo, useState } from "react";
import { Search, FileText, ArrowRight, Tag, Building2, User, Heart, Edit, Trash2, Save, ClipboardList, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKaios, type KaizenItem, type Person } from "@/contexts/KaiosContext";
import { AxisScoreTags } from "@/components/kaios/AxisScoreTags";
import { formatJpy } from "@/lib/utils";
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
import { toast } from "sonner";

const SIMILAR_TOUR_STEPS: TourStep[] = [
  { selector: '[data-tour="search-bar"]', title: "① キーワード検索", description: "スペース区切りで複数語のAND検索ができます。タイトル/課題/原因/解決策/効果が対象です。", position: "bottom" },
  { selector: '[data-tour="filters"]', title: "② 絞り込み", description: "部門・カテゴリ・タグ・並び替えで結果を絞れます。", position: "bottom" },
  { selector: '[data-tour="knowledge-base"]', title: "③ 過去の改善事例", description: "条件に一致した改善事例の一覧です。詳細から内容を確認できます。", position: "top" },
];

type SortKey = "newest" | "impact";

const SimilarCasesPage = () => {
  const { kaizenItems, getPersonById, editKaizenItem, deleteKaizenItem, updateAuthorNote } = useKaios();
  const { toggleLike, getLikeInfo } = useGuestProfile();
  const { isAdmin } = useAuth();

  // フィルタ状態
  const [query, setQuery] = useState("");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  // モーダル
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<KaizenItem | null>(null);
  const [editItem, setEditItem] = useState<KaizenItem | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<KaizenItem>>({});
  const [deleteTarget, setDeleteTarget] = useState<KaizenItem | null>(null);
  const [authorNoteDraft, setAuthorNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // 対象データ
  const approvedItems = useMemo(
    () => kaizenItems.filter(k => k.status !== "下書き"),
    [kaizenItems]
  );
  const pendingItems = useMemo(() => kaizenItems.filter(k => k.status === "申請中"), [kaizenItems]);

  // 選択肢
  const allDepts = useMemo(
    () => Array.from(new Set(approvedItems.map(i => i.department).filter(Boolean))).sort(),
    [approvedItems]
  );
  const allCats = useMemo(
    () => Array.from(new Set(approvedItems.map(i => i.category).filter(Boolean))).sort(),
    [approvedItems]
  );
  const allTags = useMemo(
    () => Array.from(new Set(approvedItems.flatMap(i => i.tags || []))).sort(),
    [approvedItems]
  );

  // フィルタリング
  const filtered = useMemo(() => {
    const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let list = approvedItems.filter(item => {
      if (selectedDepts.length && !selectedDepts.includes(item.department)) return false;
      if (selectedCats.length && !selectedCats.includes(item.category)) return false;
      if (selectedTags.length && !selectedTags.some(t => (item.tags || []).includes(t))) return false;
      if (keywords.length) {
        const hay = [
          item.title, item.problem, item.cause, item.solution, item.effect,
          ...(item.tags || []),
        ].join("\n").toLowerCase();
        // 全キーワードがどこかに含まれる（AND）
        if (!keywords.every(k => hay.includes(k))) return false;
      }
      return true;
    });
    if (sortKey === "impact") {
      list = [...list].sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));
    } else {
      list = [...list].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    }
    return list;
  }, [approvedItems, query, selectedDepts, selectedCats, selectedTags, sortKey]);

  const toggleIn = (arr: string[], v: string, setter: (a: string[]) => void) => {
    setter(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  };
  const clearAllFilters = () => {
    setQuery(""); setSelectedDepts([]); setSelectedCats([]); setSelectedTags([]); setSortKey("newest");
  };
  const hasAnyFilter = !!query.trim() || selectedDepts.length > 0 || selectedCats.length > 0 || selectedTags.length > 0;

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
              キーワードと絞り込みで過去の改善事例を検索できます。
              <span className="text-primary ml-1">過去改善 {approvedItems.length}件</span>
              {pendingItems.length > 0 && <span className="ml-2 text-amber-600">／ 申請中 {pendingItems.length}件</span>}
            </p>
          </div>
          <UITour steps={SIMILAR_TOUR_STEPS} tourKey="similar-cases" />
        </div>

        {/* 検索＆フィルタ */}
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="relative" data-tour="search-bar">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="キーワードをスペース区切りで入力（例: 属人化 標準化）"
                className="pl-9"
              />
            </div>

            <div className="space-y-3" data-tour="filters">
              {allDepts.length > 0 && (
                <FilterRow label="部門" icon={<Building2 className="w-3.5 h-3.5" />}>
                  {allDepts.map(d => (
                    <ChipToggle key={d} active={selectedDepts.includes(d)} onClick={() => toggleIn(selectedDepts, d, setSelectedDepts)}>
                      {d}
                    </ChipToggle>
                  ))}
                </FilterRow>
              )}
              {allCats.length > 0 && (
                <FilterRow label="カテゴリ" icon={<Tag className="w-3.5 h-3.5" />}>
                  {allCats.map(c => (
                    <ChipToggle key={c} active={selectedCats.includes(c)} onClick={() => toggleIn(selectedCats, c, setSelectedCats)}>
                      {c}
                    </ChipToggle>
                  ))}
                </FilterRow>
              )}
              {allTags.length > 0 && (
                <FilterRow label="タグ" icon={<Tag className="w-3.5 h-3.5" />}>
                  {allTags.map(t => (
                    <ChipToggle key={t} active={selectedTags.includes(t)} onClick={() => toggleIn(selectedTags, t, setSelectedTags)}>
                      #{t}
                    </ChipToggle>
                  ))}
                </FilterRow>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">並び替え</span>
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                  <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">新着順</SelectItem>
                    <SelectItem value="impact">インパクトスコア順</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasAnyFilter && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-muted-foreground">
                  <X className="w-3.5 h-3.5" />条件をクリア
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

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

        {/* 結果一覧 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between" data-tour="knowledge-base">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {hasAnyFilter ? "検索結果" : "過去の改善事例"}
              <Badge variant="secondary" className="text-xs">{filtered.length}件</Badge>
            </h2>
          </div>
          {filtered.length > 0 ? (
            filtered.map((item) => {
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
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
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
                        <AxisScoreTags item={item} className="mt-2" />
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
              <p className="text-sm">
                {hasAnyFilter ? "条件に一致する改善事例がありません。" : "過去の改善事例はまだありません。"}
              </p>
              {hasAnyFilter && (
                <Button variant="link" size="sm" onClick={clearAllFilters} className="mt-2">
                  条件をクリアする
                </Button>
              )}
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
              <div className="rounded-lg border border-border bg-muted/30 p-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">使用コスト（年間）</p>
                  <p className="font-bold text-foreground">{formatJpy(detailItem.usageCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">推定年間収支影響額</p>
                  <p className={`font-bold ${(detailItem.estimatedAnnualImpact ?? 0) < 0 ? "text-destructive" : "text-primary"}`}>
                    {formatJpy(detailItem.estimatedAnnualImpact)}
                  </p>
                </div>
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

const FilterRow = ({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground w-16 shrink-0 pt-1">
      {icon}{label}
    </div>
    <div className="flex flex-wrap gap-1.5 flex-1">{children}</div>
  </div>
);

const ChipToggle = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background text-foreground border-border hover:bg-muted"
    }`}
  >
    {children}
  </button>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-muted/30 p-3">
    <p className="text-xs font-bold text-muted-foreground mb-1">{label}</p>
    <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
  </div>
);

export default SimilarCasesPage;
