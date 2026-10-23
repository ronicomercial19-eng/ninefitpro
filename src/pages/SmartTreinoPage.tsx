import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import React from "react";
import {
  Activity,
  CalendarClock,
  ClipboardCheck,
  Dumbbell,
  LineChart,
  UserRound,
  Zap,
} from "lucide-react";
import { ApiConnectorCard } from "@/components/admin/ApiConnectorCard";
import TrainingAdjustmentsPage from "./TrainingAdjustmentsPage";
import { useNavigate } from "react-router-dom";
import { EcosystemGrid } from "@/components/9fit/EcosystemGrid";

export default function SmartTreinoPage() {
  const routerNavigate = useNavigate();
  const workspace = useProfessorWorkspace();
  const navigate = (path: string) => routerNavigate(workspace.link(path));
  const modules = [
    {
      title: "Treinos da semana",
      description: "Monte, revise e entregue a programação dos alunos.",
      icon: Dumbbell,
      path: "/app/alunos",
    },
    {
      title: "Planejamento",
      description: "Periodização, ciclos e semanas de treino.",
      icon: CalendarClock,
      path: "/app/smart-periodizer",
    },
    {
      title: "Ajustes inteligentes",
      description: "Recomendações baseadas no feedback e desempenho.",
      icon: Activity,
      path: "#ajustes",
    },
    {
      title: "Alunos e sinais",
      description: "Acompanhe prontidão, aderência e evolução.",
      icon: UserRound,
      path: "/app/alunos",
    },
    {
      title: "Métricas",
      description: "Leitura de carga, execução e resultados.",
      icon: LineChart,
      path: "/app/estatisticas",
    },
  ];

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">SmartTreino</h1>
          <p className="text-sm text-muted-foreground">
            Cockpit do professor para criar, revisar, ajustar e entregar
            treinos.
          </p>
        </div>
      </div>

      <ApiConnectorCard
        moduleKey="smart_treino"
        title="SmartTreino API"
        description="Conecte o motor SmartTreino para gerar séries/super-séries de referência automaticamente."
        icon={Zap}
        endpointPlaceholder="https://api.smarttreino.example.com/v1"
      />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary">
              Ecossistema do professor
            </p>
            <h2 className="text-xl font-bold">
              Tudo do SmartTreino em um só lugar
            </h2>
          </div>
          <span className="hidden text-xs text-muted-foreground md:block">
            Fluxo: analisar → decidir → aplicar → entregar
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {modules.map(({ title, description, icon: Icon, path }) => (
            <button
              key={title}
              onClick={() =>
                path === "#ajustes"
                  ? document
                      .getElementById("ajustes")
                      ?.scrollIntoView({ behavior: "smooth" })
                  : navigate(path)
              }
              className="group rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
            >
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <p className="font-semibold group-hover:text-primary">{title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section
        id="ajustes"
        className="-mx-6 border-t border-border bg-background/50 pt-2"
      >
        <TrainingAdjustmentsPage embedded />
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">
            Ecossistema compartilhado
          </p>
          <h2 className="text-xl font-bold">
            Módulos disponíveis para professor e aluno
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta lista usa os mesmos destinos do aluno. Destino configurado não
            comprova saúde do serviço nem sincronização entre aplicativos.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Treino e execução", "/app/acompanhamento"],
            ["Ficha e rotina do aluno", "/app/alunos"],
            ["Orientação e conversa", "/app/mensagens"],
          ].map(([label, path]) => (
            <button
              key={path}
              className="rounded-xl border p-4 text-left text-primary"
              onClick={() => navigate(path)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
