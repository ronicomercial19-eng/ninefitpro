
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import OptimizedIndex from "./pages/OptimizedIndex";
import Assessment from "./pages/Assessment";
import Dashboard from "./pages/Dashboard";
import AppDashboard from "./pages/AppDashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Sales from "./pages/Sales";
import WorkoutManager from "./pages/WorkoutManager";
import Pricing from "./pages/Pricing";
import AITrainingPlatform from "./pages/AITrainingPlatform";
import EnhancedAssessment from "./pages/EnhancedAssessment";
import RonyTrainerApp from "./pages/RonyTrainerApp";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RonyTrainerApp />} />
          <Route path="/home" element={<OptimizedIndex />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/ai-training" element={<AITrainingPlatform />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/enhanced-assessment" element={<EnhancedAssessment />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/app-dashboard" element={<AppDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/workout-manager" element={<WorkoutManager />} />
          <Route path="/rony-trainer" element={<RonyTrainerApp />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
