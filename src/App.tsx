import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KaiosProvider } from "@/contexts/KaiosContext";
import { GuestProfileProvider } from "@/contexts/GuestProfileContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { DebugModeWrapper } from "@/components/debug/DebugModeWrapper";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
import LoginPage from "@/pages/LoginPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <KaiosProvider>
            <GuestProfileProvider>
              <DebugModeWrapper>
                <Toaster />
                <Sonner />
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <KaiosLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/kaizen-input" element={<KaizenInputPage />} />
                    <Route path="/similar-cases" element={<SimilarCasesPage />} />
                    <Route path="/impact" element={<ImpactPage />} />
                    <Route path="/missions" element={<MissionsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/debug-reports" element={<DebugReportsPage />} />
                    <Route
                      path="/eval-settings"
                      element={
                        <ProtectedRoute requireAdmin>
                          <EvaluationSettings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/people"
                      element={
                        <ProtectedRoute requireAdmin>
                          <PeopleManagementPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminDashboardPage />
                        </ProtectedRoute>
                      }
                    />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </DebugModeWrapper>
            </GuestProfileProvider>
          </KaiosProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
