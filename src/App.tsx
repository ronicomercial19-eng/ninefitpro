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
import AIChatPage from "./pages/AIChatPage";
import AIAnalysisPage from "./pages/AIAnalysisPage";
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
import SmartTreinoPage from "./pages/SmartTreinoPage";
import SmartPeriodizer from "./pages/SmartPeriodizer";
import FitCopilotPage from "./pages/FitCopilotPage";
import WhatsAppRedirect from "./pages/WhatsAppRedirect";
import RoadmapPage from "./pages/RoadmapPage";
import ForgotPassword from "./pages/ForgotPassword";
import SettingsPage from "./pages/SettingsPage";
import Register from "./pages/Register";

// 9FIT Pages
import NineFitLogin from "./pages/9fit/Login";
import NineFitHub from "./pages/9fit/Hub";
import NineFitTrain from "./pages/9fit/Train";
// NineFitAulas removed - orphan route, replaced by AulasCreditos
import AulasCreditos from "./pages/9fit/AulasCreditos";
import NineFitStats from "./pages/9fit/Stats";
import NineFitProfile from "./pages/9fit/Profile";
import NineFitOnboarding from "./pages/9fit/Onboarding";
import NineFitDieta from "./pages/9fit/Dieta";
import NineFitMensagens from "./pages/9fit/Mensagens";
import NineFitFirstAccess from "./pages/9fit/FirstAccess";
import NineFitSocial from "./pages/9fit/Social";
import NineFitCommunity from "./pages/9fit/Community";
import NineFitStaff from "./pages/9fit/Staff";
import NineFitOS from "./pages/9fit/OS";
import NineFitStore from "./pages/9fit/Store";
import NineFitRon from "./pages/9fit/Ron";
import NineFitHealthFlix from "./pages/9fit/HealthFlix";
import NineFitPrimePass from "./pages/9fit/PrimePass";
import NineFitPlace from "./pages/9fit/Place";
import PosturaProPage from "./pages/admin/PosturaProPage";
import NexusPage from "./pages/admin/NexusPage";
import { NineFitLayout } from "./components/9fit/NineFitLayout";
import { SovereignBootstrap } from "./middleware/SovereignBootstrap";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SovereignBootstrap>
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
            <Route path="/app/smart-treino" element={
              <PrivateRoute>
                <AppLayout>
                  <SmartTreinoPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/smart-periodizer" element={
              <PrivateRoute>
                <AppLayout>
                  <SmartPeriodizer />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/fit-copilot" element={
              <PrivateRoute>
                <AppLayout>
                  <FitCopilotPage />
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
            <Route path="/app/assistente-ia" element={
              <PrivateRoute>
                <AppLayout>
                  <AIChatPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/analise-ia" element={
              <PrivateRoute>
                <AppLayout>
                  <AIAnalysisPage />
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
            <Route path="/app/healthflix" element={
              <PrivateRoute>
                <AppLayout>
                  <NineFitHealthFlix />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/postura-pro" element={
              <PrivateRoute>
                <AppLayout>
                  <PosturaProPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/ron" element={
              <PrivateRoute>
                <AppLayout>
                  <NineFitRon />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/nexus" element={
              <PrivateRoute>
                <AppLayout>
                  <NexusPage />
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
            {/* Orphan route /9fit/aulas removed - use /9fit/aulas-creditos */}
            <Route path="/9fit/aulas-creditos" element={<NineFitLayout><AulasCreditos /></NineFitLayout>} />
            <Route path="/9fit/stats" element={<NineFitLayout><NineFitStats /></NineFitLayout>} />
            <Route path="/9fit/profile" element={<NineFitLayout><NineFitProfile /></NineFitLayout>} />
            <Route path="/9fit/dieta" element={<NineFitLayout><NineFitDieta /></NineFitLayout>} />
            <Route path="/9fit/mensagens" element={<NineFitLayout><NineFitMensagens /></NineFitLayout>} />
            <Route path="/9fit/social" element={<NineFitLayout><NineFitSocial /></NineFitLayout>} />
            <Route path="/9fit/community" element={<NineFitLayout><NineFitCommunity /></NineFitLayout>} />
            <Route path="/9fit/staff" element={<NineFitLayout><NineFitStaff /></NineFitLayout>} />
            <Route path="/9fit/os" element={<NineFitLayout><NineFitOS /></NineFitLayout>} />
            <Route path="/9fit/store" element={<NineFitLayout><NineFitStore /></NineFitLayout>} />
            <Route path="/9fit/ron" element={<NineFitLayout><NineFitRon /></NineFitLayout>} />
            <Route path="/9fit/healthflix" element={<NineFitLayout><NineFitHealthFlix /></NineFitLayout>} />
            <Route path="/9fit/primepass" element={<NineFitLayout><NineFitPrimePass /></NineFitLayout>} />
            <Route path="/9fit/place" element={<NineFitLayout><NineFitPlace /></NineFitLayout>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </SovereignBootstrap>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
