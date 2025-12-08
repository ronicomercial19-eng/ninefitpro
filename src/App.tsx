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
import Perfil from "./pages/Perfil";
import ReferenceSeriesPage from "./pages/ReferenceSeriesPage";
import ReportsPage from "./pages/ReportsPage";
import Sales from "./pages/Sales";
import StatisticsPage from "./pages/StatisticsPage";
import StudentsPage from "./pages/StudentsPage";
import SuperSetsPage from "./pages/SuperSetsPage";
import Suporte from "./pages/Suporte";
import WhatsAppRedirect from "./pages/WhatsAppRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/suporte" element={<Suporte />} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
