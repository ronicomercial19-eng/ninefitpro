import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Layout from "@/components/Layout";

// Pages
import IndexPage from "@/pages/Index";
import SsoBridgePage from "@/pages/SsoBridgePage";
import OnboardingAssessmentPage from "@/pages/OnboardingAssessmentPage";
import AssessmentSelectionPage from "@/pages/AssessmentSelectionPage";

// SSO/Auth pages (exemplo)
import LoginPage from "@/pages/auth/LoginPage";
import CallbackPage from "@/pages/auth/CallbackPage";

import "./App.css";

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Routes>
                {/* ===== Auth Routes (sem Layout) ===== */}
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/callback" element={<CallbackPage />} />
                <Route path="/sso" element={<SsoBridgePage />} />

                {/* ===== Protected Routes (com Layout) ===== */}
                <Route element={<Layout />}>
                  {/* Dashboard principal */}
                  <Route index element={<IndexPage />} />
                  <Route path="/" element={<IndexPage />} />

                  {/* Assessment Onboarding Flow */}
                  <Route path="/avaliacao-guiada/select" element={<AssessmentSelectionPage />} />
                  <Route
                    path="/avaliacao-guiada/minha-avaliacao"
                    element={<OnboardingAssessmentPage mode="self" athleteId={localStorage.getItem('userId') || ''} />}
                  />
                  <Route
                    path="/avaliacao-guiada/:studentId"
                    element={<OnboardingAssessmentPage mode="professor" athleteId={''} />}
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
