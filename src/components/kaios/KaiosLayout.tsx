import KaiosSidebar from "@/components/kaios/KaiosSidebar";
import KaiosHeader from "@/components/kaios/KaiosHeader";
import { Outlet } from "react-router-dom";

const KaiosLayout = () => {
  return (
    <div className="flex min-h-screen w-full">
      <KaiosSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <KaiosHeader />
        <Outlet />
      </div>
    </div>
  );
};

export default KaiosLayout;
