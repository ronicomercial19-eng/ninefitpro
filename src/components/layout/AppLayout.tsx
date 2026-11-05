import {ProfessorQuickActions} from '@/components/students/ProfessorQuickActions';
import { CareReturnBanner } from "@/components/students/CareReturnBanner";
import {
  ProfessorWorkspaceProvider,
  ProfessorStudentBar,
  ProfessorScope,
  useProfessorWorkspace,
} from "@/contexts/ProfessorWorkspace";
import { Link, NavLink } from "react-router-dom";
import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import "./nine-core.css";
import { runNineCoreTransition } from "./nineCoreTransition";
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
  "/app": "Visão geral",
  "/app/mensagens": "Mensagens",
  "/app/acompanhamento": "Acompanhamento",
  "/app/ron": "RON",
  "/app/assistente-ia": "Prescrever treino",
  "/app/analise-ia": "Análise IA",
  "/app/smart-periodizer": "Periodização",
  "/app/smart-treino": "Ajustes de treino",
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
  React.useEffect(() => {
    const root = document.documentElement;
    root.dataset.ninefitSurface = "professor";
    const clock = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "numeric",
      hourCycle: "h23",
    });
    const updateAtmosphere = () => {
      const hour = Number(clock.format(new Date()));
      root.dataset.nineCoreShift = hour >= 20 || hour < 5 ? "night" : hour < 10 ? "morning" : "day";
    };
    updateAtmosphere();
    const interval = window.setInterval(updateAtmosphere, 60_000);
    return () => {
      window.clearInterval(interval);
      delete root.dataset.nineCoreShift;
      if (root.dataset.ninefitSurface === "professor") delete root.dataset.ninefitSurface;
    };
  }, []);
  const location = useLocation();
  const navigate = useNavigate();
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

  function animateNavigation(event: React.MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!document.startViewTransition || !matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-nine-core-transition]") : null;
    if (!link || link.target || link.hasAttribute("download")) return;
    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin || destination.pathname === location.pathname) return;

    event.preventDefault();
    runNineCoreTransition(link.dataset.nineCoreTransition === "student" ? "student" : "module", () => {
      navigate(destination.pathname + destination.search + destination.hash);
    });
  }


  return (
    <ProfessorWorkspaceProvider key={user?.id}>
      <SidebarProvider defaultOpen={true}>
        <div className="nine-core min-h-screen flex w-full bg-background" onClickCapture={animateNavigation}>
          <AppSidebar />

          <div className="min-w-0 flex-1 flex flex-col">
            {/* Top Header */}
            <header className="nine-core-header min-h-[calc(4rem+env(safe-area-inset-top))] border-b border-border bg-card flex items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
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
            <main className="nine-core-main min-w-0 flex-1 p-4 sm:p-6 xl:p-8">
              <div className="nine-core-workspace">
                <ProfessorStudentBar />
                <ProfessorQuickActions />
              </div>
              <CareReturnBanner professional />
              <NexusDock />
              <div className="nine-core-route"><ProfessorScope>{children}</ProfessorScope></div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProfessorWorkspaceProvider>
  );
}

const nexusDestinations = [
  { path: "/app/nexus", label: "NEXUS" },
  { path: "/app", label: "Operacional" },
  { path: "/app/healthflix", label: "Conteúdo" },
  { path: "/app/monetizacao", label: "Financeiro", adminOnly: true },
];

function NexusDock() {
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();
  const workspace = useProfessorWorkspace();
  const destinations = nexusDestinations.filter(({ adminOnly }) => !adminOnly || isAdmin);
  if (!destinations.some(({ path }) => path === pathname)) return null;

  return (
    <nav className="nine-core-nexus-dock" aria-label="Áreas do NEXUS">
      {destinations.map(({ path, label }) => (
        <NavLink key={path} end to={workspace.link(path)} data-nine-core-transition="module">
          {({ isActive }) => (
            <>
              {isActive && <span className="nine-core-nexus-light" aria-hidden="true" />}
              <span className="relative">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
