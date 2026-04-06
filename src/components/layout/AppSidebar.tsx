import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Dumbbell, 
  Zap, 
  Bot, 
  BarChart3, 
  FileText,
  ChevronRight,
  Map,
  Sparkles,
  Brain,
  CalendarClock,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

import { Settings } from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', url: '/app', icon: LayoutDashboard },
  { title: 'Agenda', url: '/app/agenda', icon: Calendar },
  { title: 'Alunos', url: '/app/alunos', icon: Users },
  { title: 'Exercícios', url: '/app/exercicios', icon: Dumbbell },
  { title: 'SmartTreino', url: '/app/smart-treino', icon: Zap },
  { title: 'SmartPeriodizer', url: '/app/smart-periodizer', icon: CalendarClock },
  { title: 'FitCopilot', url: '/app/fit-copilot', icon: Cpu },
  { title: 'Treino com IA', url: '/app/treino-ia', icon: Bot },
  { title: 'Assistente IA', url: '/app/assistente-ia', icon: Sparkles },
  { title: 'Análise IA', url: '/app/analise-ia', icon: Brain },
  { title: 'Estatísticas', url: '/app/estatisticas', icon: BarChart3 },
  { title: 'Relatórios', url: '/app/relatorios', icon: FileText },
  { title: 'Roadmap', url: '/app/roadmap', icon: Map },
  { title: 'Configurações', url: '/app/configuracoes', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const currentPath = location.pathname;
  const { profile } = useAuth();

  const displayName = profile?.full_name || 'Professor';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className={cn(
      "border-r border-border bg-card",
      collapsed ? "w-16" : "w-64"
    )}>
      <SidebarContent className="bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="text-lg font-bold text-foreground">9FIT PRO</h2>
                <p className="text-xs text-muted-foreground">Painel do Professor</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        isActive(item.url) 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {isActive(item.url) && (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User info at bottom */}
        <div className="mt-auto p-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
             <span className="text-sm font-medium">{initials}</span>
            </div>
            {!collapsed && (
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">Professor</p>
              </div>
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}