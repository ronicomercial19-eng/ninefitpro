import { NineCoreTools } from "./NineCoreTools";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Dumbbell,
  Zap,
  Bot,
  BarChart3,
  FileText,
  ChevronDown,
  MessageSquare,
  Layers,
  ListOrdered,
  ScanLine,
  ClipboardCheck,
  Globe,
  CreditCard,
  FolderOpen,
  Map,
  Sparkles,
  Brain,
  CalendarClock,
  Cpu,
  Film,
  Activity,
  Atom,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { Settings } from "lucide-react";

const menuItems = [
  { title: "Visão geral", url: "/app", icon: LayoutDashboard },
  { title: "Agenda", url: "/app/agenda", icon: Calendar },
  { title: "Acompanhamento", url: "/app/acompanhamento", icon: Activity },
  { title: "Mensagens", url: "/app/mensagens", icon: MessageSquare },
  { title: "Alunos", url: "/app/alunos", icon: Users },
  { title: "Exercícios", url: "/app/exercicios", icon: Dumbbell },
  { title: "Super Séries", url: "/app/super-series", icon: Layers },
  {
    title: "Séries de referência",
    url: "/app/series-referencia",
    icon: ListOrdered,
  },
  { title: "Ajustes de treino", url: "/app/smart-treino", icon: Zap },
  {
    title: "Periodização",
    url: "/app/smart-periodizer",
    icon: CalendarClock,
  },
  { title: "FitCopilot", url: "/app/fit-copilot", icon: Cpu },
  { title: "Prescrever treino", url: "/app/assistente-ia", icon: Sparkles },
  { title: "HealthFlix", url: "/app/healthflix", icon: Film },
  { title: "Comunidade", url: "/app/community", icon: Globe },
  { title: "Avaliação física", url: "/app/avaliacoes", icon: ClipboardCheck },
  { title: "Postura Pro", url: "/app/postura-pro", icon: ScanLine },
  { title: "RON", url: "/app/ron", icon: Bot },
  { title: "NEXUS", url: "/app/nexus", icon: Atom },
  { title: "Skills", url: "/app/skills", icon: Brain },
  { title: "Monetização", url: "/app/monetizacao", icon: CreditCard },
  { title: "Modelos 9FIT", url: "/app/modelos-ninefit", icon: FolderOpen },
  { title: "Estatísticas", url: "/app/estatisticas", icon: BarChart3 },
  { title: "Relatórios", url: "/app/relatorios", icon: FileText },
  { title: "Roadmap", url: "/app/roadmap", icon: Map },
  { title: "Configurações", url: "/app/configuracoes", icon: Settings },
];

const dailyPaths = ["/app", "/app/alunos", "/app/agenda", "/app/acompanhamento", "/app/mensagens"];
const libraryPaths = ["/app/exercicios", "/app/super-series", "/app/series-referencia", "/app/modelos-ninefit"];
const groups = [
  { id: "training", label: "Treinamento", paths: ["/app/smart-periodizer", "/app/assistente-ia", "/app/smart-treino", ...libraryPaths] },
  { id: "analysis", label: "Avaliação e análise", paths: ["/app/avaliacoes", "/app/postura-pro", "/app/estatisticas", "/app/relatorios"] },
  { id: "content", label: "Conteúdo", paths: ["/app/healthflix", "/app/community", "/app/monetizacao"] },
  { id: "tools", label: "Ferramentas", paths: ["/app/ron", "/app/fit-copilot", "/app/skills", "/app/nexus", "/app/roadmap"] },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const { profile, isAdmin } = useAuth();
  const workspace = useProfessorWorkspace();

  const displayName = profile?.full_name || "Professor";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const renderItem = (path: string) => {
    const item = menuItems.find(candidate => candidate.url === path);
    if (!item || (!isAdmin && path === "/app/monetizacao")) return null;
    return <SidebarMenuItem key={path}><SidebarMenuButton asChild>
      <NavLink end={path !== "/app/avaliacoes"} to={workspace.link(path)} onClick={() => setOpenMobile(false)} aria-label={item.title} title={item.title} data-nine-core-transition="module" className="nine-core-nav-link min-h-10">
        <item.icon aria-hidden="true" />{!collapsed && <span>{item.title}</span>}
      </NavLink>
    </SidebarMenuButton></SidebarMenuItem>;
  };

  return (
    <Sidebar
      className={cn(
        "border-r border-border bg-card",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <SidebarContent className="bg-card pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <div className="nine-core-brand p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="nine-core-mark" aria-hidden="true">
              9
            </div>
            {!collapsed && (
              <div>
                <h2 className="text-lg font-bold text-foreground">NINE CORE</h2>
                <p className="text-xs text-muted-foreground">
                  Nine Pro · Professor
                </p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarMenu>{dailyPaths.map(renderItem)}</SidebarMenu>
        </SidebarGroup>

        {groups.map((group) => {
          const active = group.paths.includes(currentPath) ||
            (group.id === "training" && currentPath === "/app/treino-ia") ||
            (group.id === "analysis" && currentPath.startsWith("/app/avaliacoes/"));
          const open = openGroups[group.id] ?? active;
          return (
            <SidebarGroup key={group.id}>
              <SidebarGroupContent>
                {collapsed ? (
                  <SidebarMenu>{group.paths.map(renderItem)}{group.id === "tools" && <NineCoreTools collapsed />}</SidebarMenu>
                ) : (
                  <>
                    <SidebarMenuButton
                      type="button"
                      className="nine-core-nav-group min-h-10"
                      data-nine-core-drawer={group.id === "tools" ? "" : undefined}
                      aria-expanded={open}
                      aria-controls={`nine-core-nav-${group.id}`}
                      onClick={() => setOpenGroups((previous) => ({ ...previous, [group.id]: !open }))}
                    >
                      <span>{group.label}</span>
                      <ChevronDown aria-hidden="true" className={cn("ml-auto", open && "rotate-180")} />
                    </SidebarMenuButton>
                    <SidebarMenu id={`nine-core-nav-${group.id}`} hidden={!open} className={open ? "nine-core-nav-nested" : "hidden"}>
                      {group.paths.map(renderItem)}
                      {group.id === "tools" && <NineCoreTools collapsed={false} />}
                    </SidebarMenu>
                  </>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="border-t border-border bg-card pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <SidebarMenu>{renderItem("/app/configuracoes")}</SidebarMenu>
        {/* User info at bottom */}
        <div className="mt-auto p-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">{initials}</span>
            </div>
            {!collapsed && (
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground">Professor</p>
              </div>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
