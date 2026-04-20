import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KaiosProvider } from "@/contexts/KaiosContext";
import { GuestProfileProvider } from "@/contexts/GuestProfileContext";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { DebugModeWrapper } from "@/components/debug/DebugModeWrapper";
import { AdminGuard } from "@/components/admin/AdminGuard";
import KaiosLayout from "@/components/kaios/KaiosLayout";
import EvaluationSettings from "@/components/kaios/EvaluationSettings";
import KaizenInputPage from "@/pages/KaizenInputPage";
import SimilarCasesPage from "@/pages/SimilarCasesPage";
import ImpactPage from "@/pages/ImpactPage";
import SettingsPage from "@/pages/SettingsPage";
import PeopleManagementPage from "@/pages/PeopleManagementPage";
import DebugReportsPage from "@/pages/DebugReportsPage";
import DashboardPage from "@/pages/DashboardPage";
import MissionsPage from "@/pages/MissionsPage";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <KaiosProvider>
        <GuestProfileProvider>
          <AdminAuthProvider>
            <DebugModeWrapper>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route element={<KaiosLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/kaizen-input" element={<KaizenInputPage />} />
                    <Route path="/similar-cases" element={<SimilarCasesPage />} />
                    <Route path="/impact" element={<ImpactPage />} />
                    <Route path="/missions" element={<MissionsPage />} />
                    <Route path="/eval-settings" element={<AdminGuard><EvaluationSettings /></AdminGuard>} />
                    <Route path="/people" element={<PeopleManagementPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/debug-reports" element={<DebugReportsPage />} />
                  </Route>
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route path="/admin" element={<AdminGuard><AdminDashboardPage /></AdminGuard>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </DebugModeWrapper>
          </AdminAuthProvider>
        </GuestProfileProvider>
      </KaiosProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
