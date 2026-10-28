import { lazy, Suspense } from "react";
const StudentCarePage = lazy(() => import("@/pages/9fit/Acompanhamento"));
const ProfessorWorkspacePage = lazy(() => import("@/pages/ProfessorWorkspacePage"));
const ProfessorMessagesPage = lazy(() => import("@/pages/ProfessorMessagesPage"));
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster as Sonner } from "@/components/ui/sonner";
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const CustomerEntry = lazy(() => import("./pages/9fit/CustomerEntry"));
const PaymentReturn = lazy(() => import("./pages/9fit/PaymentReturn"));
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppErrorBoundary } from "./components/system/AppErrorBoundary";
const AgendaPage = lazy(() => import("./pages/AgendaPage"));
const AITrainingPage = lazy(() => import("./pages/AITrainingPage"));
const AIChatPage = lazy(() => import("./pages/AIChatPage"));
const AIAnalysisPage = lazy(() => import("./pages/AIAnalysisPage"));
const Assessment = lazy(() => import("./pages/Assessment"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TrainingAdjustmentsPage = lazy(() => import("./pages/TrainingAdjustmentsPage"));
const ExercisesPage = lazy(() => import("./pages/ExercisesPage"));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ReferenceSeriesPage = lazy(() => import("./pages/ReferenceSeriesPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const Sales = lazy(() => import("./pages/Sales"));
const StatisticsPage = lazy(() => import("./pages/StatisticsPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const SuperSetsPage = lazy(() => import("./pages/SuperSetsPage"));
const Support = lazy(() => import("./pages/Support"));
const SmartTreinoPage = lazy(() => import("./pages/SmartTreinoPage"));
const SmartPeriodizer = lazy(() => import("./pages/SmartPeriodizer"));
const FitCopilotPage = lazy(() => import("./pages/FitCopilotPage"));
const WhatsAppRedirect = lazy(() => import("./pages/WhatsAppRedirect"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Register = lazy(() => import("./pages/Register"));

// 9FIT Pages
const NineFitLogin = lazy(() => import("./pages/9fit/Login"));
const NineFitHub = lazy(() => import("./pages/9fit/Hub"));
const NineFitTrain = lazy(() => import("./pages/9fit/Train"));
// NineFitAulas removed - orphan route, replaced by AulasCreditos
const AulasCreditos = lazy(() => import("./pages/9fit/AulasCreditos"));
// NineFitStats removed - duplicate of /9fit/progresso (NineFitProgresso), retirada em 13/09
const NineFitProfile = lazy(() => import("./pages/9fit/Profile"));
const NineFitOnboarding = lazy(() => import("./pages/9fit/Onboarding"));
const NineFitDieta = lazy(() => import("./pages/9fit/Dieta"));
const NineFitFoods = lazy(() => import("./pages/9fit/Foods"));
const NineFitMensagens = lazy(() => import("./pages/9fit/Mensagens"));
const NineFitNotificacoes = lazy(() => import("./pages/9fit/Notificacoes"));
const NineFitFirstAccess = lazy(() => import("./pages/9fit/FirstAccess"));
const NineFitSocial = lazy(() => import("./pages/9fit/Social"));
const NineFitCommunity = lazy(() => import("./pages/9fit/Community"));
const NineFitStaff = lazy(() => import("./pages/9fit/Staff"));
const NineFitOS = lazy(() => import("./pages/9fit/OS"));
const NineFitRon = lazy(() => import("./pages/9fit/Ron"));
const NineFitHealthFlix = lazy(() => import("./pages/9fit/HealthFlix"));
const NineFitPrimePass = lazy(() => import("./pages/9fit/PrimePass"));
const NineFitHabitFlow = lazy(() => import("./pages/9fit/HabitFlow"));
const NineFitEliteBio = lazy(() => import("./pages/9fit/EliteBioHacking"));
const NineFitKitchen = lazy(() => import("./pages/9fit/Kitchen"));
const NineFitRecovery = lazy(() => import("./pages/9fit/Recovery"));
const NineFitProtocolo = lazy(() => import("./pages/9fit/Protocolo"));
const NineFitPlans = lazy(() => import("./pages/9fit/Plans"));
const NineFitOferta = lazy(() => import("./pages/9fit/Oferta"));
const NineFitCheckout = lazy(() => import("./pages/9fit/Checkout"));
const NineFitCheckoutSuccess = lazy(() => import("./pages/9fit/CheckoutSuccess"));
const NineFitAtivacao = lazy(() => import("./pages/9fit/Ativacao"));
const NineFitPlanejamento = lazy(() => import("./pages/9fit/Planejamento"));
const NineFitBiblioteca = lazy(() => import("./pages/9fit/Biblioteca"));
const NineFitProgresso = lazy(() => import("./pages/9fit/Progresso"));
const NineFitPosturaPro = lazy(() => import("./pages/9fit/PosturaPro"));
const NineFitNativeSystem = lazy(() => import("./pages/9fit/NativeSystem"));
const NineFitAvaliacaoGuiada = lazy(() => import("./pages/9fit/AvaliacaoGuiada"));
const NineFitAssessmentPages = lazy(() => import("./pages/9fit/AssessmentPages"));
const NineFitCompartilhar = lazy(() => import("./pages/9fit/Compartilhar"));
const NineFitMove = lazy(() => import("./pages/9fit/Move"));
const NineFitModules = lazy(() => import("./pages/9fit/Modules"));

const NineFitAjusteTreino = lazy(() => import("./pages/9fit/AjusteTreino"));
const NineFitPostWorkout = lazy(() => import("./pages/9fit/PostWorkout"));
const NineFitCollections = lazy(() => import("./pages/9fit/Collections"));
const MonetizacaoPage = lazy(() => import("./pages/admin/MonetizacaoPage"));
const SkillManagerPage = lazy(() => import("./pages/admin/SkillManagerPage"));
const Protocols = lazy(() => import("./pages/9fit/Protocols"));
const NineFitSettings = lazy(() => import("./pages/9fit/Settings"));
import { MissionCompleteOverlay } from "./components/9fit/MissionCompleteOverlay";
const PosturaProPage = lazy(() => import("./pages/admin/PosturaProPage"));
const CommunityAdminPage = lazy(() => import("./pages/admin/CommunityAdminPage"));
const NexusPage = lazy(() => import("./pages/admin/NexusPage"));
const RonProfessorPage = lazy(() => import("./pages/admin/RonProfessorPage"));
const HealthFlixAdminPage = lazy(() => import("./pages/admin/HealthFlixAdminPage"));
import { StudentSubscriptionList } from "./components/admin/StudentSubscriptionList";
import { InfinitePayWebhookConfig } from "./components/admin/InfinitePayWebhookConfig";
const NineFitTemplateLibraryPage = lazy(() => import("./pages/admin/NineFitTemplateLibraryPage"));
import { NineFitLayout } from "./components/9fit/NineFitLayout";
import { EcoEmbed } from "./components/9fit/EcoEmbed";
import { SovereignBootstrap } from "./middleware/SovereignBootstrap";

import { useAppSplash } from "@/hooks/useAppSplash";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    // A lost response does not prove a write failed. Opt in only when the
    // individual mutation has a server-side idempotency key.
    mutations: { retry: false },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MissionCompleteOverlay />
        <BrowserRouter>
          <SovereignBootstrap>
          <AppErrorBoundary><Suspense fallback={<div className="min-h-[60vh] grid place-items-center" role="status">Carregando página…</div>}><Routes>
            {/* Public Routes - Login is the main entry point */}
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/9fit/entrada" element={<CustomerEntry />} />
            <Route path="/9fit/pagamento/retorno" element={<PaymentReturn />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/dashboard" element={<Navigate to="/app" replace />} />
            <Route path="/9fit/onboarding-pro" element={<Navigate to="/9fit/hub" replace />} />
            <Route path="/9fit/stats" element={<Navigate to="/9fit/progresso" replace />} />
            <Route path="/9fit/aulas" element={<Navigate to="/9fit/aulas-creditos" replace />} />
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
                  <HealthFlixAdminPage />
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
                  <RonProfessorPage />
                </AppLayout>
              </PrivateRoute>
            } />
            <Route path="/app/acompanhamento" element={<PrivateRoute><AppLayout><ProfessorWorkspacePage /></AppLayout></PrivateRoute>} />
            <Route path="/app/mensagens" element={<PrivateRoute><AppLayout><ProfessorMessagesPage /></AppLayout></PrivateRoute>} />
            <Route path="/app/ajustes-treino" element={
              <PrivateRoute><AppLayout><TrainingAdjustmentsPage /></AppLayout></PrivateRoute>
            } />
            <Route path="/app/nexus" element={
              <PrivateRoute allowedRoles={["admin", "super_admin"]}>
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
            <Route path="/9fit/embed" element={<NineFitLayout><EcoEmbed title={new URLSearchParams(window.location.search).get("title") || "Ecossistema"} url={new URLSearchParams(window.location.search).get("url") || "/9fit/hub"} /></NineFitLayout>} />
            <Route path="/9fit/home" element={<Navigate to="/9fit/os" replace />} />
            <Route path="/9fit/train" element={<NineFitLayout><NineFitTrain /></NineFitLayout>} />
            {/* Orphan route /9fit/aulas removed - use /9fit/aulas-creditos */}
            <Route path="/9fit/aulas-creditos" element={<NineFitLayout><AulasCreditos /></NineFitLayout>} />
            {/* /9fit/stats removida em 13/09 - tela duplicada de /9fit/progresso, sem callers restantes */}
            <Route path="/9fit/profile" element={<NineFitLayout><NineFitProfile /></NineFitLayout>} />
            <Route path="/9fit/dieta" element={<NineFitLayout><NineFitDieta /></NineFitLayout>} />
            <Route path="/9fit/foods" element={<NineFitLayout><NineFitFoods /></NineFitLayout>} />
            <Route path="/9fit/acompanhamento" element={<NineFitLayout><StudentCarePage /></NineFitLayout>} />
            <Route path="/9fit/mensagens" element={<NineFitLayout><NineFitMensagens /></NineFitLayout>} />
            <Route path="/9fit/notificacoes" element={<NineFitLayout><NineFitNotificacoes /></NineFitLayout>} />
            <Route path="/9fit/social" element={<NineFitLayout><NineFitSocial /></NineFitLayout>} />
            <Route path="/9fit/community" element={<NineFitLayout><NineFitCommunity /></NineFitLayout>} />
            <Route path="/9fit/staff" element={<NineFitLayout><NineFitStaff /></NineFitLayout>} />
            <Route path="/9fit/os" element={<NineFitLayout><NineFitOS /></NineFitLayout>} />
            <Route path="/9fit/ron" element={<NineFitLayout><NineFitRon /></NineFitLayout>} />
            <Route path="/9fit/healthflix" element={<NineFitLayout><NineFitHealthFlix /></NineFitLayout>} />
            <Route path="/9fit/primepass" element={<NineFitLayout><NineFitPrimePass /></NineFitLayout>} />
            <Route path="/9fit/habit-flow" element={<NineFitLayout><NineFitHabitFlow /></NineFitLayout>} />
            <Route path="/9fit/habitflow" element={<NineFitLayout><NineFitHabitFlow /></NineFitLayout>} />
            <Route path="/9fit/elite-bio" element={<NineFitLayout><NineFitEliteBio /></NineFitLayout>} />
            <Route path="/9fit/kitchen" element={<NineFitLayout><NineFitKitchen /></NineFitLayout>} />
            <Route path="/9fit/recovery" element={<NineFitLayout><NineFitRecovery /></NineFitLayout>} />
            <Route path="/9fit/protocolo" element={<NineFitLayout><NineFitProtocolo /></NineFitLayout>} />
            <Route path="/9fit/planos" element={<NineFitLayout><NineFitPrimePass /></NineFitLayout>} />
            <Route path="/9fit/prime" element={<NineFitLayout><NineFitPrimePass /></NineFitLayout>} />
            <Route path="/9fit/oferta/:offerId" element={<NineFitOferta />} />
            <Route path="/9fit/checkout/:offerId" element={<NineFitCheckout />} />
            <Route path="/9fit/checkout/success" element={<NineFitCheckoutSuccess />} />

            <Route path="/9fit/protocols" element={<NineFitLayout><Protocols /></NineFitLayout>} />
            <Route path="/9fit/protocols/:category" element={<NineFitLayout><Protocols /></NineFitLayout>} />
            <Route path="/9fit/protocols/:category/:id" element={<NineFitLayout><Protocols /></NineFitLayout>} />
            <Route path="/9fit/settings" element={<NineFitLayout><NineFitSettings /></NineFitLayout>} />
            <Route path="/9fit/ativacao" element={<NineFitLayout><NineFitAtivacao /></NineFitLayout>} />
            <Route path="/9fit/planejamento" element={<NineFitLayout><NineFitPlanejamento /></NineFitLayout>} />
            <Route path="/9fit/biblioteca" element={<NineFitLayout><NineFitBiblioteca /></NineFitLayout>} />
            <Route path="/9fit/progresso" element={<NineFitLayout><NineFitProgresso /></NineFitLayout>} />
            <Route path="/9fit/progresso/:view" element={<NineFitLayout><NineFitAssessmentPages /></NineFitLayout>} />
            <Route path="/9fit/avaliacao" element={<Navigate to="/9fit/progresso/historico" replace />} />
            <Route path="/9fit/avaliacao/:id" element={<NineFitLayout><NineFitAssessmentPages /></NineFitLayout>} />
            <Route path="/9fit/avaliacao/:id/:section" element={<NineFitLayout><NineFitAssessmentPages /></NineFitLayout>} />
            <Route path="/9fit/postura-pro" element={<NineFitLayout><NineFitPosturaPro /></NineFitLayout>} />
            <Route path="/9fit/progresso/recordes" element={<NineFitLayout><NineFitProgresso /></NineFitLayout>} />
            <Route path="/9fit/premium" element={<NineFitLayout><NineFitPrimePass /></NineFitLayout>} />
            <Route path="/9fit/billing" element={<NineFitLayout><NineFitPrimePass /></NineFitLayout>} />
            <Route path="/9fit/store" element={<Navigate to="/9fit/native-system?app=store" replace />} />
            <Route path="/9fit/events" element={<NineFitLayout><NineFitCommunity /></NineFitLayout>} />
            <Route path="/9fit/compartilhar" element={<NineFitLayout><NineFitCompartilhar /></NineFitLayout>} />
            <Route path="/9fit/move" element={<NineFitLayout><NineFitMove /></NineFitLayout>} />
            <Route path="/9fit/modules" element={<NineFitLayout><NineFitModules /></NineFitLayout>} />
            <Route path="/9fit/avaliacao-guiada" element={<NineFitLayout><NineFitAvaliacaoGuiada /></NineFitLayout>} />

            <Route path="/9fit/ajuste-treino" element={<NineFitLayout><NineFitAjusteTreino /></NineFitLayout>} />
            <Route path="/9fit/pos-treino" element={<NineFitLayout><NineFitPostWorkout /></NineFitLayout>} />
            <Route path="/9fit/collections" element={<NineFitLayout><NineFitCollections /></NineFitLayout>} />
            <Route path="/9fit/native-system" element={<NineFitLayout><NineFitNativeSystem /></NineFitLayout>} />

            <Route path="/app/monetizacao" element={
              <PrivateRoute allowedRoles={["admin", "super_admin"]}><AppLayout><MonetizacaoPage /></AppLayout></PrivateRoute>
            } />
            <Route path="/app/community" element={<PrivateRoute><AppLayout><CommunityAdminPage /></AppLayout></PrivateRoute>} />
            <Route path="/app/alunos-assinaturas" element={
              <PrivateRoute allowedRoles={["admin", "super_admin"]}><AppLayout><StudentSubscriptionList /></AppLayout></PrivateRoute>
            } />
            <Route path="/app/configuracao-webhook" element={
              <PrivateRoute allowedRoles={["admin", "super_admin"]}><AppLayout><InfinitePayWebhookConfig /></AppLayout></PrivateRoute>
            } />
            <Route path="/app/skills" element={
              <PrivateRoute allowedRoles={["admin", "super_admin"]}><AppLayout><SkillManagerPage /></AppLayout></PrivateRoute>
            } />
            <Route path="/app/modelos-ninefit" element={
              <PrivateRoute allowedRoles={["admin", "super_admin"]}><AppLayout><NineFitTemplateLibraryPage /></AppLayout></PrivateRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes></Suspense></AppErrorBoundary>
          </SovereignBootstrap>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
