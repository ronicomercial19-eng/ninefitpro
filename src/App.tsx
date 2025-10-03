
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import OptimizedIndex from "./pages/OptimizedIndex";
import Assessment from "./pages/Assessment";
import AppDashboard from "./pages/AppDashboard";
import GymDashboard from "./pages/GymDashboard";
import StudentsPage from "./pages/StudentsPage";
import ExercisesPage from "./pages/ExercisesPage";
import SuperSetsPage from "./pages/SuperSetsPage";
import ReferenceSeriesPage from "./pages/ReferenceSeriesPage";
import AITrainingPage from "./pages/AITrainingPage";
import StatisticsPage from "./pages/StatisticsPage";
import ReportsPage from "./pages/ReportsPage";
import AgendaPage from "./pages/AgendaPage";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Sales from "./pages/Sales";
import WorkoutManager from "./pages/WorkoutManager";
import Pricing from "./pages/Pricing";
import AITrainingPlatform from "./pages/AITrainingPlatform";
import EnhancedAssessment from "./pages/EnhancedAssessment";
import RonyTrainerApp from "./pages/RonyTrainerApp";
import FitnessApp from "./pages/FitnessApp";
import StudentApp from "./pages/StudentApp";
import Auth from "./pages/Auth";
import HomeDashboard from "./pages/HomeDashboard";
import DiscoverPage from "./pages/DiscoverPage";
import ListOverviewPage from "./pages/ListOverviewPage";
import GeneralPanelPage from "./pages/GeneralPanelPage";
import StudentAreaPage from "./pages/StudentAreaPage";
import Perfil from "./pages/Perfil";
import Suporte from "./pages/Suporte";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeDashboard />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/suporte" element={<Suporte />} />
            <Route path="/conecte-se" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/professor" element={
              <PrivateRoute>
                <RonyTrainerApp />
              </PrivateRoute>
            } />
            <Route path="/student" element={
              <PrivateRoute>
                <StudentApp />
              </PrivateRoute>
            } />
            <Route path="/home" element={<OptimizedIndex />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/ai-training" element={<AITrainingPlatform />} />
            <Route path="/assessment" element={<Assessment />} />
            <Route path="/enhanced-assessment" element={<EnhancedAssessment />} />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <AppLayout>
                  <GymDashboard />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/agenda" element={
              <PrivateRoute>
                <AppLayout>
                  <AgendaPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/alunos" element={
              <PrivateRoute>
                <AppLayout>
                  <StudentsPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/exercicios" element={
              <PrivateRoute>
                <AppLayout>
                  <ExercisesPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/super-series" element={
              <PrivateRoute>
                <AppLayout>
                  <SuperSetsPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/series-referencia" element={
              <PrivateRoute>
                <AppLayout>
                  <ReferenceSeriesPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/treino-ia" element={
              <PrivateRoute>
                <AppLayout>
                  <AITrainingPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/estatisticas" element={
              <PrivateRoute>
                <AppLayout>
                  <StatisticsPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/relatorios" element={
              <PrivateRoute>
                <AppLayout>
                  <ReportsPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/lar" element={
              <PrivateRoute>
                <HomeDashboard />
              </PrivateRoute>
            } />
            <Route path="/descobrir" element={
              <PrivateRoute>
                <DiscoverPage />
              </PrivateRoute>
            } />
            <Route path="/visao-geral-da-lista" element={
              <PrivateRoute>
                <ListOverviewPage />
              </PrivateRoute>
            } />
            <Route path="/painel-geral" element={
              <PrivateRoute>
                <GeneralPanelPage />
              </PrivateRoute>
            } />
            <Route path="/area-do-aluno" element={
              <PrivateRoute>
                <StudentAreaPage />
              </PrivateRoute>
            } />
            <Route path="/app-dashboard" element={<AppDashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/workout-manager" element={<WorkoutManager />} />
            <Route path="/rony-trainer" element={<RonyTrainerApp />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
