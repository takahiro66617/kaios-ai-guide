import { HelpCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const KaiosHeader = () => {
  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
      <nav className="text-sm text-muted-foreground">
        <span>KAIOS</span>
        <span className="mx-2">/</span>
        <span className="text-foreground font-medium">評価方針設定</span>
      </nav>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
          <HelpCircle className="w-4 h-4" />
          使い方ガイド
        </Button>
        <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
      </div>
    </header>
  );
};

export default KaiosHeader;
