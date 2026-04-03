import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/": "評価方針設定",
  "/people": "提案者管理",
  "/kaizen-input": "改善入力と整理",
  "/similar-cases": "類似事例を探す",
  "/impact": "インパクトの見える化",
  "/settings": "設定",
};

const KaiosHeader = () => {
  const location = useLocation();
  const currentTitle = pageTitles[location.pathname] || "KAIOS";

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
      <nav className="text-sm text-muted-foreground">
        <span>KAIOS</span>
        <span className="mx-2">/</span>
        <span className="text-foreground font-medium">{currentTitle}</span>
      </nav>
    </header>
  );
};

export default KaiosHeader;
