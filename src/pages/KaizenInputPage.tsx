import { useState } from "react";
import { Lightbulb, Plus, Tag, Filter, Search, FileText, ArrowUpRight, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface KaizenItem {
  id: number;
  title: string;
  description: string;
  department: string;
  category: string;
  status: "新規" | "整理済み" | "評価中";
  createdAt: string;
}

const initialItems: KaizenItem[] = [
  {
    id: 1,
    title: "受注処理の自動化提案",
    description: "手入力による受注処理をRPAで自動化し、処理時間を50%削減する。",
    department: "営業部",
    category: "業務効率化",
    status: "整理済み",
    createdAt: "2026-04-01",
  },
  {
    id: 2,
    title: "社内FAQチャットボットの導入",
    description: "問い合わせ対応の属人化を解消し、24時間対応可能な体制を構築する。",
    department: "情報システム部",
    category: "DX推進",
    status: "評価中",
    createdAt: "2026-03-28",
  },
  {
    id: 3,
    title: "在庫管理のリアルタイム可視化",
    description: "倉庫の在庫データをダッシュボード化し、発注判断を迅速化する。",
    department: "物流部",
    category: "可視化",
    status: "新規",
    createdAt: "2026-04-02",
  },
  {
    id: 4,
    title: "会議資料のテンプレート標準化",
    description: "部門ごとにバラバラだった会議資料フォーマットを統一し、準備時間を短縮。",
    department: "経営企画部",
    category: "標準化",
    status: "新規",
    createdAt: "2026-04-03",
  },
];

const statusColors: Record<string, string> = {
  "新規": "bg-primary/10 text-primary border-primary/20",
  "整理済み": "bg-kaios-success/10 text-kaios-success border-kaios-success/20",
  "評価中": "bg-kaios-warning-bg text-kaios-warning-text border-kaios-warning-border",
};

const KaizenInputPage = () => {
  const [items, setItems] = useState<KaizenItem[]>(initialItems);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const filteredItems = items.filter((item) => {
    const matchCategory = filterCategory === "all" || item.category === filterCategory;
    const matchSearch =
      searchQuery === "" ||
      item.title.includes(searchQuery) ||
      item.description.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  const categories = [...new Set(items.map((i) => i.category))];

  const handleAdd = () => {
    if (!newTitle.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    const newItem: KaizenItem = {
      id: Date.now(),
      title: newTitle,
      description: newDesc,
      department: newDept || "未設定",
      category: newCategory || "その他",
      status: "新規",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setItems([newItem, ...items]);
    setNewTitle("");
    setNewDesc("");
    setNewDept("");
    setNewCategory("");
    toast.success("改善案を登録しました");
  };

  const handleStatusChange = (id: number) => {
    setItems(items.map((item) => {
      if (item.id !== id) return item;
      const next = item.status === "新規" ? "整理済み" : item.status === "整理済み" ? "評価中" : "新規";
      return { ...item, status: next as KaizenItem["status"] };
    }));
    toast.success("ステータスを更新しました");
  };

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-primary" />
              改善入力と整理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              現場から上がった「気づき」や「改善案」を登録・構造化し、AIによる評価に備えます。
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                新しい改善案を登録
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新しい改善案を登録</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium text-foreground">タイトル *</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="改善案のタイトル"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">詳細説明</label>
                  <Textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="改善案の詳細を記入してください"
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">部門</label>
                    <Input
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      placeholder="例：営業部"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">カテゴリ</label>
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="例：業務効率化"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">キャンセル</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={handleAdd}>登録</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="改善案を検索..."
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="カテゴリで絞り込み" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Items */}
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      <Badge variant="outline" className={statusColors[item.status]}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {item.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {item.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.createdAt}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange(item.id)} className="shrink-0 gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    ステータス更新
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>該当する改善案が見つかりませんでした。</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default KaizenInputPage;
