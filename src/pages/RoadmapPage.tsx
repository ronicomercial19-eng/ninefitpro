import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
const modules = [
  [
    "Dashboard",
    "/app",
    "Panorama da carteira e período, calculado a partir das execuções e prescrições.",
  ],
  [
    "Alunos",
    "/app/alunos",
    "Selecionar aluno, abrir ficha, atualizar dados e acompanhar os registros vinculados.",
  ],
  [
    "Exercícios",
    "/app/exercicios",
    "Buscar no acervo, filtrar e usar na prescrição.",
  ],
  [
    "Super Séries",
    "/app/super-series",
    "Compor exercícios, salvar modelo, carregar no editor, revisar e publicar.",
  ],
  [
    "Séries de referência",
    "/app/series-referencia",
    "Salvar composição reutilizável e revisar antes de entregar ao aluno.",
  ],
  [
    "SmartTreino",
    "/app/smart-treino",
    "Navegar entre prescrição, periodização e revisão dos ajustes mantendo o aluno.",
  ],
  [
    "SmartPeriodizer",
    "/app/smart-periodizer",
    "Rascunhos semanais revisados → ciclo publicado → planejamento do aluno.",
  ],
  [
    "FitCopilot",
    "/app/fit-copilot",
    "Analisar o contexto, revisar ajustes e acompanhar a entrega nativa.",
  ],
  [
    "Treino com IA",
    "/app/treino-ia",
    "Rascunho sugerido ou modelo → revisão profissional → sessão publicada.",
  ],
  [
    "Assistente IA",
    "/app/assistente-ia",
    "Consulta contextual com histórico privado do profissional.",
  ],
  [
    "Análise IA",
    "/app/analise-ia",
    "Análise do aluno selecionado; recomendações exigem decisão profissional.",
  ],
  [
    "Estatísticas",
    "/app/estatisticas",
    "Mesma fonte e período do panorama, sem confundir pessoas com atribuições.",
  ],
  [
    "Relatórios",
    "/app/relatorios",
    "Consultar indicadores e exportar dados reais em CSV.",
  ],
  [
    "Agenda",
    "/app/agenda",
    "Criar horários, impedir conflitos e confirmar alterações na agenda vinculada.",
  ],
  [
    "Ajustes",
    "/app/ajustes-treino",
    "Revisão → prévia → alteração concreta → versão e notificação ao aluno.",
  ],
  [
    "HealthFlix",
    "/app/healthflix",
    "Publicar ou ocultar no catálogo efetivo compartilhado com o aluno.",
  ],
  [
    "Postura Pro",
    "/app/postura-pro",
    "Upload privado → processamento → resultado concluído visível ao aluno.",
  ],
  [
    "RON",
    "/app/ron",
    "Conversa contextual com histórico, sem execução automática de sugestões.",
  ],
  [
    "Acompanhamento",
    "/app/acompanhamento",
    "Dados do aluno, origem dos sinais e acesso às ações profissionais.",
  ],
  [
    "Mensagens",
    "/app/mensagens",
    "Mensagem humana → registro único → conversa e notificação do destinatário.",
  ],
  [
    "Comunidade",
    "/app/community",
    "Abre a gestão no módulo externo; não simula importação ou sessão compartilhada.",
  ],
  [
    "Configurações",
    "/app/configuracoes",
    "Salvar perfil e preferências; mudança de senha confirmada pelo Auth.",
  ],
  [
    "Monetização",
    "/app/monetizacao",
    "Publicar ofertas com checkout válido; o pagamento continua confirmado pelo provedor.",
    "admin",
  ],
  [
    "Skills",
    "/app/skills",
    "Gravar skill e ativação global na mesma transação.",
    "admin",
  ],
  [
    "NEXUS",
    "/app/nexus",
    "Consultar conectores e eventos. Configuração ativa não comprova disponibilidade.",
    "admin",
  ],
  [
    "Modelos 9FIT",
    "/app/modelos-ninefit",
    "Revisar estado do modelo com confirmação do registro atualizado.",
    "admin",
  ],
];
export default function RoadmapPage() {
  const { isAdmin } = useAuth(),
    w = useProfessorWorkspace();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Mapa operacional do painel</h1>
      <p>
        Cada módulo mostra seu caminho de entrega. Provedores externos dependem
        da configuração e resposta da integração; este mapa não apresenta
        percentuais de QA ou disponibilidade.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {modules
          .filter((m) => isAdmin || m[3] !== "admin")
          .map(([name, path, loop]) => (
            <article key={path} className="rounded-xl border p-4 space-y-2">
              <Link
                to={w.link(path)}
                className="font-semibold text-primary underline"
              >
                {name}
              </Link>
              <p className="text-sm text-muted-foreground">{loop}</p>
            </article>
          ))}
      </div>
    </div>
  );
}
