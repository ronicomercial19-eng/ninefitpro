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
  BookOpen,
  ClipboardPenLine,
  ChartNoAxesCombined,
  MessageSquare,
  Layers,
  ListOrdered,
  ScanLine,
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
  SidebarGroupLabel,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { Settings } from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard },
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
  { title: "SmartTreino", url: "/app/smart-treino", icon: Zap },
  {
    title: "SmartPeriodizer",
    url: "/app/smart-periodizer",
    icon: CalendarClock,
  },
  { title: "FitCopilot", url: "/app/fit-copilot", icon: Cpu },
  { title: "Treino com IA", url: "/app/treino-ia", icon: ClipboardPenLine },
  { title: "Assistente IA", url: "/app/assistente-ia", icon: Sparkles },
  { title: "Análise IA", url: "/app/analise-ia", icon: ChartNoAxesCombined },
  { title: "HealthFlix", url: "/app/healthflix", icon: Film },
  { title: "Comunidade", url: "/app/community", icon: Globe },
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

const groups = [
  { label: "Dia a dia", paths: ["/app", "/app/agenda", "/app/acompanhamento", "/app/alunos", "/app/mensagens"] },
  { label: "Prescrição", paths: ["/app/smart-periodizer", "/app/smart-treino"], library: true },
  { label: "Assistentes de IA", paths: ["/app/ron", "/app/fit-copilot", "/app/assistente-ia", "/app/treino-ia", "/app/analise-ia"] },
  { label: "Análise", paths: ["/app/estatisticas", "/app/relatorios"] },
  { label: "Crescimento", paths: ["/app/community", "/app/healthflix", "/app/monetizacao"] },
  { label: "Avançado", paths: ["/app/postura-pro", "/app/skills", "/app/nexus", "/app/roadmap", "/app/modelos-ninefit"] },
];
const libraryPaths = ["/app/exercicios", "/app/super-series", "/app/series-referencia"];

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

  const [libraryOpen, setLibraryOpen] = useState(() => localStorage.getItem("9fit:professor-library-open") !== "false");
  const renderItem = (path: string) => {
    const item = menuItems.find(candidate => candidate.url === path);
    if (!item || (!isAdmin && path === "/app/monetizacao")) return null;
    return <SidebarMenuItem key={path}><SidebarMenuButton asChild>
      <NavLink end to={workspace.link(path)} onClick={() => setOpenMobile(false)} aria-label={item.title} className={cn("min-h-11 rounded-lg", currentPath === path && "bg-primary/15 text-primary font-semibold")}>
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
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="text-lg font-bold text-foreground">9FIT PRO</h2>
                <p className="text-xs text-muted-foreground">
                  Painel do Professor
                </p>
              </div>
            )}
          </div>
        </div>

        {groups.map(group => <SidebarGroup key={group.label}>
          {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.paths.map(renderItem)}
              {group.library && <>
                {!collapsed && <SidebarMenuItem>
                  <SidebarMenuButton className="min-h-11" aria-expanded={libraryOpen} onClick={() => {
                    localStorage.setItem("9fit:professor-library-open", String(!libraryOpen));
                    setLibraryOpen(!libraryOpen);
                  }}>
                    <BookOpen aria-hidden="true" /> <span>Biblioteca</span>
                    <ChevronDown className={cn("ml-auto", libraryOpen && "rotate-180")} />
                  </SidebarMenuButton>
                </SidebarMenuItem>}
                {(libraryOpen || collapsed || libraryPaths.includes(currentPath)) && libraryPaths.map(renderItem)}
              </>}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>)}
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
