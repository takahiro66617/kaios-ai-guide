import { useState } from "react";
import KaiosSidebar from "@/components/kaios/KaiosSidebar";
import KaiosHeader from "@/components/kaios/KaiosHeader";
import { Outlet } from "react-router-dom";

const KaiosLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <KaiosSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <KaiosHeader onMenuToggle={() => setSidebarOpen(true)} />
        <Outlet />
      </div>
    </div>
  );
};

export default KaiosLayout;
