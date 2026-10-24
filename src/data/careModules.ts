export const CARE_MODULES = [
  {
    key: "onboarding",
    title: "Entrada, ficha e objetivos",
    studentPaths: ["/9fit/first-access", "/9fit/onboarding", "/9fit/ativacao"],
    professionalPath: "/app/alunos",
    actionLabel: "Revisar ficha e rotina",
    cycle:
      "Perfil e preferências declarados; confirmar objetivo e orientar configuração.",
  },
  {
    key: "daily",
    title: "Dia e prontidão",
    studentPaths: ["/9fit/os", "/9fit/hub"],
    professionalPath: "/app/acompanhamento",
    actionLabel: "Revisar o dia",
    cycle:
      "Check-in, SYNC, dor e registros do dia; devolver orientação contextual.",
  },
  {
    key: "training",
    title: "Treino e substituições",
    studentPaths: ["/9fit/train", "/9fit/ajuste-treino"],
    professionalPath: "/app/treino-ia",
    actionLabel: "Revisar prescrição",
    cycle:
      "Sessão, exercícios, impedimento e substituição; publicar revisão preservando execução.",
  },
  {
    key: "planning",
    title: "Planejamento e ciclos",
    studentPaths: ["/9fit/planejamento"],
    professionalPath: "/app/smart-periodizer",
    actionLabel: "Revisar ciclo",
    cycle: "Rotina, semanas e disponibilidade; devolver ciclo revisado.",
  },
  {
    key: "feedback",
    title: "Pós-treino",
    studentPaths: ["/9fit/pos-treino"],
    professionalPath: "/app/acompanhamento",
    actionLabel: "Revisar resposta ao treino",
    cycle:
      "Execução e esforço percebido; devolver orientação e acompanhar a próxima sessão.",
  },
  {
    key: "assessment",
    title: "Avaliações, medidas e recordes",
    studentPaths: [
      "/9fit/progresso",
      "/9fit/avaliacao",
      "/9fit/avaliacao-guiada",
    ],
    professionalPath: "/app/alunos",
    actionLabel: "Abrir ficha de avaliações",
    cycle:
      "Auto-relato e avaliação com origem; comparar protocolos compatíveis e devolver interpretação.",
  },
  {
    key: "profile",
    title: "Perfil e preferências",
    studentPaths: ["/9fit/profile"],
    professionalPath: "/app/alunos",
    actionLabel: "Revisar dados do aluno",
    cycle:
      "Objetivo, limitações, contato e rotina; atualizar dados sem sobrescrever respostas pessoais.",
  },
  {
    key: "nutrition",
    title: "Plano alimentar",
    studentPaths: ["/9fit/dieta"],
    professionalPath: "/app/alunos",
    actionLabel: "Abrir ficha e plano",
    cycle:
      "Plano e dificuldades compartilhadas; orientação pelo responsável com acesso à área.",
  },
  {
    key: "foods",
    title: "Registros de alimentação",
    studentPaths: ["/9fit/foods"],
    professionalPath: "/app/acompanhamento",
    actionLabel: "Revisar registros compartilhados",
    cycle:
      "Refeições e dificuldades; não inferir adequação a partir de quantidade de registros.",
  },
  {
    key: "hydration",
    title: "Hidratação",
    studentPaths: [],
    professionalPath: "/app/acompanhamento",
    actionLabel: "Revisar rotina",
    cycle:
      "Água registrada e meta acordada; acompanhamento no contexto diário.",
  },
  {
    key: "schedule",
    title: "Aulas, agenda e créditos",
    studentPaths: ["/9fit/aulas-creditos"],
    professionalPath: "/app/agenda",
    actionLabel: "Abrir agenda",
    cycle:
      "Confirmação, cancelamento, reagendamento e presença; saldo reconciliado.",
  },
  {
    key: "ron",
    title: "Dúvida ao profissional a partir do RON",
    studentPaths: ["/9fit/ron"],
    professionalPath: "/app/ron",
    actionLabel: "Analisar contexto do aluno",
    cycle:
      "Compartilhar somente o texto escolhido pelo aluno; conversas pessoais com IA ficam privadas.",
  },
  {
    key: "community",
    title: "Comunidade e social",
    studentPaths: ["/9fit/community", "/9fit/social", "/9fit/events"],
    professionalPath: "/app/community",
    actionLabel: "Abrir gestão de comunidade",
    cycle:
      "Solicitação compartilhada voluntariamente; não importar feed privado ou afirmar SSO.",
  },
  {
    key: "library",
    title: "Biblioteca e execução técnica",
    studentPaths: ["/9fit/biblioteca"],
    professionalPath: "/app/exercicios",
    actionLabel: "Abrir acervo",
    cycle:
      "Dúvida técnica sobre conteúdo; devolver instrução ou prescrição pertinente.",
  },
  {
    key: "healthflix",
    title: "HealthFlix",
    studentPaths: ["/9fit/healthflix"],
    professionalPath: "/app/healthflix",
    actionLabel: "Abrir catálogo",
    cycle: "Dificuldade e consumo de conteúdo; devolver indicação e objetivo.",
  },
  {
    key: "habits",
    title: "Hábitos",
    studentPaths: ["/9fit/habit-flow", "/9fit/habitflow"],
    professionalPath: "/app/acompanhamento",
    actionLabel: "Revisar hábitos",
    cycle: "Conclusões e barreiras; acordar frequência e revisar evolução.",
  },
  {
    key: "posture",
    title: "Postura e imagens",
    studentPaths: ["/9fit/postura-pro"],
    professionalPath: "/app/postura-pro",
    actionLabel: "Revisar avaliação postural",
    cycle:
      "Imagem privada e resultado concluído; devolver análise e acompanhamento.",
  },
  {
    key: "bio",
    title: "Sono e recuperação percebida",
    studentPaths: ["/9fit/elite-bio"],
    professionalPath: "/app/acompanhamento",
    actionLabel: "Revisar sinais",
    cycle:
      "Sinais registrados com origem e data; orientar sem tratar score como diagnóstico.",
  },
  {
    key: "kitchen",
    title: "Cozinha e receitas",
    studentPaths: ["/9fit/kitchen"],
    professionalPath: "/app/alunos",
    actionLabel: "Abrir acompanhamento",
    cycle:
      "Preferências e dificuldades; devolver orientação pertinente ao plano.",
  },
  {
    key: "recovery",
    title: "Recuperação e protocolos",
    studentPaths: ["/9fit/recovery", "/9fit/protocolo", "/9fit/protocols"],
    professionalPath: "/app/alunos",
    actionLabel: "Abrir ficha e protocolos",
    cycle: "Atribuição, conclusão e resposta percebida; revisar continuidade.",
  },
  {
    key: "collections",
    title: "Coleções e programas",
    studentPaths: ["/9fit/collections"],
    professionalPath: "/app/smart-periodizer",
    actionLabel: "Revisar programa",
    cycle: "Programa escolhido e dúvidas; orientar uso e programação.",
  },
  {
    key: "move",
    title: "Move e atividades externas",
    studentPaths: ["/9fit/move"],
    professionalPath: "/app/acompanhamento",
    actionLabel: "Revisar atividades",
    cycle:
      "Distância, duração e percepção compartilhadas; considerar no acompanhamento.",
  },
  {
    key: "messages",
    title: "Conversa e acompanhamento",
    studentPaths: ["/9fit/mensagens", "/9fit/acompanhamento"],
    professionalPath: "/app/mensagens",
    actionLabel: "Abrir conversa humana",
    cycle:
      "Pergunta contextual, resposta, visualização e confirmação em fluxos separados.",
  },
  {
    key: "staff",
    title: "Meu profissional e vínculo",
    studentPaths: ["/9fit/staff"],
    professionalPath: "/app/alunos",
    actionLabel: "Abrir vínculo",
    cycle:
      "Solicitação sobre responsável e acompanhamento; não conceder acesso a profissional sem vínculo.",
  },
  {
    key: "weekly",
    title: "Revisão semanal",
    studentPaths: [],
    professionalPath: "/app/acompanhamento",
    actionLabel: "Revisar semana",
    cycle: "Barreiras, percepção e acordo da próxima semana.",
  },
  {
    key: "general",
    title: "Outras orientações",
    studentPaths: [],
    professionalPath: "/app/acompanhamento",
    actionLabel: "Abrir acompanhamento",
    cycle:
      "Solicitação explícita do aluno ou orientação do profissional responsável.",
  },
] as const;
export type CareModuleKey = (typeof CARE_MODULES)[number]["key"];
export function careModuleForPath(path: string) {
  return CARE_MODULES.find((m) =>
    m.studentPaths.some((p) => path === p || path.startsWith(p + "/")),
  );
}
export function careModule(key: string | null | undefined) {
  return (
    CARE_MODULES.find((m) => m.key === key) ||
    CARE_MODULES.find((m) => m.key === "general")!
  );
}
