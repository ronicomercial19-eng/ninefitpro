import { CareReturnBanner } from "@/components/students/CareReturnBanner";
import {
  ProfessorWorkspaceProvider,
  ProfessorStudentBar,
  ProfessorScope,
} from "@/contexts/ProfessorWorkspace";
import { Link } from "react-router-dom";
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Settings } from "lucide-react";
import { NotificationBell } from "@/components/9fit/NotificationBell";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface AppLayoutProps {
  children: React.ReactNode;
}

const routeLabels: Record<string, string> = {
  "/app": "Dashboard",
  "/app/mensagens": "Mensagens",
  "/app/acompanhamento": "Acompanhamento",
  "/app/ron": "RON",
  "/app/assistente-ia": "Assistente IA",
  "/app/analise-ia": "Análise IA",
  "/app/smart-periodizer": "Periodização",
  "/app/smart-treino": "SmartTreino",
  "/app/fit-copilot": "FitCopilot",
  "/app/configuracoes": "Configurações",
  "/app/alunos": "Alunos",
  "/app/exercicios": "Exercícios",
  "/app/super-series": "Super Séries",
  "/app/series-referencia": "Séries de Referência",
  "/app/treino-ia": "Treino IA",
  "/app/estatisticas": "Estatísticas",
  "/app/relatorios": "Relatórios",
  "/app/agenda": "Agenda",
};

export function AppLayout({ children }: AppLayoutProps) {
  React.useEffect(()=>{document.documentElement.dataset.ninefitSurface='professor';return()=>{if(document.documentElement.dataset.ninefitSurface==='professor')delete document.documentElement.dataset.ninefitSurface;};},[]);
  const location = useLocation();
  const {
    isTrainer,
    loading,
    user,
    profile,
    roleStatus,
    retryIdentity,
    logout,
  } = useAuth();

  if (!loading && !user) return <Navigate to="/login" replace />;

  if (roleStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-4">
          <h1 className="text-lg font-semibold">
            Não foi possível verificar seu acesso
          </h1>
          <p className="text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => void retryIdentity()}>
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={() => void logout()}>
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Aguarda o papel carregar antes de decidir o acesso.
  if (loading || roleStatus === "idle" || roleStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Verificando seu acesso…
          </p>
        </div>
      </div>
    );
  }

  if (!isTrainer) return <Navigate to="/9fit/hub" replace />;

  const getBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter(Boolean);
    const breadcrumbs = [{ label: "Início", path: "/app" }];

    let currentPath = "/app";
    paths.slice(1).forEach((path) => {
      currentPath += `/${path}`;
      const label = routeLabels[currentPath] || path;
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <ProfessorWorkspaceProvider key={user?.id}>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />

          <div className="min-w-0 flex-1 flex flex-col">
            {/* Top Header */}
            <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div className="hidden md:flex items-center gap-2 mr-2">
                  <div className="w-7 h-7 rounded bg-[#EF7A45] flex items-center justify-center text-white font-display text-sm">
                    9
                  </div>
                  <span className="font-display text-base tracking-tight">
                    9FIT · 9FIT PRO
                  </span>
                </div>
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => (
                      <div key={crumb.path} className="flex items-center">
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {index === breadcrumbs.length - 1 ? (
                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href={crumb.path}>
                              {crumb.label}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              <div className="flex items-center gap-2">
                <NotificationBell />
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/app/configuracoes" aria-label="Configurações">
                    <Settings className="w-5 h-5" />
                  </Link>
                </Button>
                <Link to="/suporte" className="text-sm text-muted-foreground">
                  Ajuda
                </Link>
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {(profile?.full_name || "Professor")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="min-w-0 flex-1 p-3 sm:p-6 bg-muted/20">
              <ProfessorStudentBar />
            <CareReturnBanner professional />
              <ProfessorScope>{children}</ProfessorScope>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProfessorWorkspaceProvider>
  );
}
