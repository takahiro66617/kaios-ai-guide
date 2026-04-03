import KaiosSidebar from "@/components/kaios/KaiosSidebar";
import KaiosHeader from "@/components/kaios/KaiosHeader";
import EvaluationSettings from "@/components/kaios/EvaluationSettings";

const Index = () => {
  return (
    <div className="flex min-h-screen w-full">
      <KaiosSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <KaiosHeader />
        <EvaluationSettings />
      </div>
    </div>
  );
};

export default Index;
