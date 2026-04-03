import { Settings, Lightbulb, Search, BarChart3, Sparkles, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const menuItems = [
  { title: "評価方針設定", subtitle: "AIの評価基準をチューニング", icon: Sparkles, path: "/" },
  { title: "提案者管理", subtitle: "メンバーの追加・編集", icon: Users, path: "/people" },
  { title: "改善入力と整理", subtitle: "現場の気づきを構造化", icon: Lightbulb, path: "/kaizen-input" },
  { title: "類似事例を探す", subtitle: "過去のナレッジを検索", icon: Search, path: "/similar-cases" },
  { title: "インパクトの見える化", subtitle: "組織への貢献度を可視化", icon: BarChart3, path: "/impact" },
];

interface KaiosSidebarProps {
  open: boolean;
  onClose: () => void;
}

const KaiosSidebar = ({ open, onClose }: KaiosSidebarProps) => {
  const location = useLocation();

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-[250px] bg-card border-r border-border flex flex-col shrink-0 transition-transform duration-200 ease-in-out
      lg:relative lg:translate-x-0
      ${open ? "translate-x-0" : "-translate-x-full"}
    `}>
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground tracking-tight">KAIOS</span>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.title}
              to={item.path}
              onClick={onClose}
              className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                isActive
                  ? "bg-kaios-brand-light text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <item.icon className={`w-5 h-5 mt-0.5 shrink-0 ${isActive ? "text-primary" : ""}`} />
              <div>
                <div className={`text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}>{item.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">山田</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">山田 太郎</div>
          <div className="text-xs text-muted-foreground">システム管理者</div>
        </div>
        <Link to="/settings" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </aside>
  );
};

export default KaiosSidebar;
