import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/": "評価方針設定",
  "/people": "提案者管理",
  "/kaizen-input": "改善入力と整理",
  "/similar-cases": "類似事例を探す",
  "/impact": "インパクトの見える化",
  "/settings": "設定",
  "/debug-reports": "バグレポート管理",
};

interface KaiosHeaderProps {
  onMenuToggle: () => void;
}

const KaiosHeader = ({ onMenuToggle }: KaiosHeaderProps) => {
  const location = useLocation();
  const currentTitle = pageTitles[location.pathname] || "KAIOS";

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
          <Menu className="w-5 h-5" />
        </Button>
        <nav className="text-sm text-muted-foreground">
          <span className="hidden sm:inline">KAIOS</span>
          <span className="hidden sm:inline mx-2">/</span>
          <span className="text-foreground font-medium">{currentTitle}</span>
        </nav>
      </div>
    </header>
  );
};

export default KaiosHeader;
