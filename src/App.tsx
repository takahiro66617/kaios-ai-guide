import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KaiosProvider } from "@/contexts/KaiosContext";
import KaiosLayout from "@/components/kaios/KaiosLayout";
import EvaluationSettings from "@/components/kaios/EvaluationSettings";
import KaizenInputPage from "@/pages/KaizenInputPage";
import SimilarCasesPage from "@/pages/SimilarCasesPage";
import ImpactPage from "@/pages/ImpactPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <KaiosProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<KaiosLayout />}>
              <Route path="/" element={<EvaluationSettings />} />
              <Route path="/kaizen-input" element={<KaizenInputPage />} />
              <Route path="/similar-cases" element={<SimilarCasesPage />} />
              <Route path="/impact" element={<ImpactPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </KaiosProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
