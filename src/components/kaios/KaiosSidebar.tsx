import { Settings, Lightbulb, Search, BarChart3, Sparkles } from "lucide-react";

const menuItems = [
  {
    title: "評価方針設定",
    subtitle: "AIの評価基準をチューニング",
    icon: Sparkles,
    active: true,
  },
  {
    title: "改善入力と整理",
    subtitle: "現場の気づきを構造化",
    icon: Lightbulb,
    active: false,
  },
  {
    title: "類似事例を探す",
    subtitle: "過去のナレッジを検索",
    icon: Search,
    active: false,
  },
  {
    title: "インパクトの見える化",
    subtitle: "組織への貢献度を可視化",
    icon: BarChart3,
    active: false,
  },
];

const KaiosSidebar = () => {
  return (
    <aside className="w-[250px] min-h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground tracking-tight">KAIOS</span>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.title}
            className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
              item.active
                ? "bg-kaios-brand-light text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <item.icon className={`w-5 h-5 mt-0.5 shrink-0 ${item.active ? "text-primary" : ""}`} />
            <div>
              <div className={`text-sm font-medium ${item.active ? "text-primary" : "text-foreground"}`}>
                {item.title}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</div>
            </div>
          </button>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
          山田
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">山田 太郎</div>
          <div className="text-xs text-muted-foreground">システム管理者</div>
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

export default KaiosSidebar;
