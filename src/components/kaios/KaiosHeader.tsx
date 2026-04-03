import { useState } from "react";
import { HelpCircle, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const pageTitles: Record<string, string> = {
  "/": "評価方針設定",
  "/kaizen-input": "改善入力と整理",
  "/similar-cases": "類似事例を探す",
  "/impact": "インパクトの見える化",
  "/settings": "設定",
};

const notifications = [
  { id: 1, text: "営業部から新しい改善案が3件登録されました", time: "5分前", read: false },
  { id: 2, text: "評価方針の設定が更新されました", time: "1時間前", read: false },
  { id: 3, text: "「受注処理の自動化」が評価完了しました", time: "3時間前", read: true },
];

const KaiosHeader = () => {
  const location = useLocation();
  const currentTitle = pageTitles[location.pathname] || "KAIOS";
  const [notifs, setNotifs] = useState(notifications);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifs(notifs.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
      <nav className="text-sm text-muted-foreground">
        <span>KAIOS</span>
        <span className="mx-2">/</span>
        <span className="text-foreground font-medium">{currentTitle}</span>
      </nav>

      <div className="flex items-center gap-2">
        {/* Guide Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
              <HelpCircle className="w-4 h-4" />
              使い方ガイド
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>使い方ガイド</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4 text-sm text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground mb-1">📊 評価方針設定</h3>
                <p>左側のスライダーを動かして、AIの評価基準をチューニングします。右側のプレビューでリアルタイムに評価スタンスが確認できます。</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">💡 改善入力と整理</h3>
                <p>現場から上がった気づきや改善案を登録し、カテゴリやステータスで構造化して管理します。</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">🔍 類似事例を探す</h3>
                <p>キーワードを入力すると、AIが過去のナレッジから類似度の高い事例を自動で推薦します。</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">📈 インパクトの見える化</h3>
                <p>改善活動が組織に与えるインパクトをグラフやKPIで多角的に可視化します。</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h4 className="text-sm font-semibold text-foreground">通知</h4>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  すべて既読にする
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-auto">
              {notifs.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-border last:border-0 ${
                    n.read ? "" : "bg-primary/5"
                  }`}
                >
                  <p className="text-sm text-foreground">{n.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
};

export default KaiosHeader;
