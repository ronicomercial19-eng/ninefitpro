import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AgendaPage from "./pages/AgendaPage";
import AITrainingPage from "./pages/AITrainingPage";
import Assessment from "./pages/Assessment";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ExercisesPage from "./pages/ExercisesPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ReferenceSeriesPage from "./pages/ReferenceSeriesPage";
import ReportsPage from "./pages/ReportsPage";
import Sales from "./pages/Sales";
import StatisticsPage from "./pages/StatisticsPage";
import StudentsPage from "./pages/StudentsPage";
import SuperSetsPage from "./pages/SuperSetsPage";
import Support from "./pages/Support";
import WhatsAppRedirect from "./pages/WhatsAppRedirect";
import RoadmapPage from "./pages/RoadmapPage";
import ForgotPassword from "./pages/ForgotPassword";
import SettingsPage from "./pages/SettingsPage";
import Register from "./pages/Register";

// 9FIT Pages
import NineFitLogin from "./pages/9fit/Login";
import NineFitHub from "./pages/9fit/Hub";
import NineFitTrain from "./pages/9fit/Train";
import NineFitAulas from "./pages/9fit/Aulas";
import NineFitStats from "./pages/9fit/Stats";
import NineFitProfile from "./pages/9fit/Profile";
import NineFitOnboarding from "./pages/9fit/Onboarding";
import NineFitDieta from "./pages/9fit/Dieta";
import NineFitMensagens from "./pages/9fit/Mensagens";
import NineFitFirstAccess from "./pages/9fit/FirstAccess";
import { NineFitLayout } from "./components/9fit/NineFitLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes - Login is the main entry point */}
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/suporte" element={<Support />} />
            <Route path="/whatsapp-redirect" element={<WhatsAppRedirect />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/assessment" element={<Assessment />} />

            {/* App Routes - All under /app */}
            <Route path="/app" element={
              <PrivateRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/alunos" element={
              <PrivateRoute>
                <AppLayout>
                  <StudentsPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/exercicios" element={
              <PrivateRoute>
                <AppLayout>
                  <ExercisesPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/super-series" element={
              <PrivateRoute>
                <AppLayout>
                  <SuperSetsPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/series-referencia" element={
              <PrivateRoute>
                <AppLayout>
                  <ReferenceSeriesPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/treino-ia" element={
              <PrivateRoute>
                <AppLayout>
                  <AITrainingPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/estatisticas" element={
              <PrivateRoute>
                <AppLayout>
                  <StatisticsPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/relatorios" element={
              <PrivateRoute>
                <AppLayout>
                  <ReportsPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/agenda" element={
              <PrivateRoute>
                <AppLayout>
                  <AgendaPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/roadmap" element={
              <PrivateRoute>
                <AppLayout>
                  <RoadmapPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/configuracoes" element={
              <PrivateRoute>
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              </PrivateRoute>
            } />
            
            {/* 9FIT Routes - Public */}
            <Route path="/9fit" element={<NineFitLogin />} />
            <Route path="/9fit/login" element={<NineFitLogin />} />
            <Route path="/9fit/onboarding" element={<NineFitOnboarding />} />
            <Route path="/9fit/first-access" element={<NineFitFirstAccess />} />
            
            {/* 9FIT Routes - Protected */}
            <Route path="/9fit/hub" element={<NineFitLayout><NineFitHub /></NineFitLayout>} />
            <Route path="/9fit/train" element={<NineFitLayout><NineFitTrain /></NineFitLayout>} />
            <Route path="/9fit/aulas" element={<NineFitLayout><NineFitAulas /></NineFitLayout>} />
            <Route path="/9fit/stats" element={<NineFitLayout><NineFitStats /></NineFitLayout>} />
            <Route path="/9fit/profile" element={<NineFitLayout><NineFitProfile /></NineFitLayout>} />
            <Route path="/9fit/dieta" element={<NineFitLayout><NineFitDieta /></NineFitLayout>} />
            <Route path="/9fit/mensagens" element={<NineFitLayout><NineFitMensagens /></NineFitLayout>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
