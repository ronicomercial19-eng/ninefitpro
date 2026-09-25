/**
 * RON Operational Core — Centro de Inteligência, Guia Operacional e Concierge do 9FIT PRO
 * 
 * Conecta o RON com TODOS os componentes da aplicação:
 * - Executa ações (iniciar treinos, agendar na Google Agenda, disparar recovery)
 * - Cria registros (refeições, hidratação, pontos de dor, anotações de evolução)
 * - Apaga/cancela itens (refeições do log, eventos de agenda, histórico de dor)
 * - Relaciona/Interliga dados (Dor ↔ Substituição de Exercícios; Sono/HRV ↔ Volume do Treino; Dieta ↔ Horário de Treino)
 * - Analisa biometria em profundidade (Strain, RPE acumulado, Janela de Glicogênio)
 * - Sugere e Opina com autoridade técnica desportiva
 * - Conhece o mapa de rotas e componentes completos do app
 */

import { emitNexus } from "./nexus/nexusBus";
import { toast } from "sonner";
import { createCalendarWorkoutEvent, syncWeeklyWorkouts } from "./googleCalendar";
import { getAccessToken } from "./googleAuth";

export type RonOperationType =
  | "NAVIGATE"
  | "SCHEDULE_CALENDAR"
  | "SYNC_WEEK_CALENDAR"
  | "START_WORKOUT"
  | "LOG_NUTRITION"
  | "DELETE_NUTRITION"
  | "LOG_WATER"
  | "REGISTER_PAIN"
  | "CLEAR_PAIN"
  | "TRIGGER_RECOVERY"
  | "COMPLETE_MISSION"
  | "ADJUST_TRAINING_VOLUME"
  | "ANALYZE_PROFILE"
  | "SHOW_OPINION";

export interface RonAction {
  id?: string;
  type: RonOperationType;
  title: string;
  description?: string;
  payload?: Record<string, any>;
  autoExecute?: boolean;
}

export interface RonAnalysisResult {
  biometricSummary: string;
  readinessScore: number;
  fatigueRisk: "baixo" | "moderado" | "alto" | "critico";
  interlinkedRecommendations: string[];
  suggestedAction?: RonAction;
}

/**
 * Conhecimento completo da arquitetura e rotas do 9FIT PRO
 */
export const APP_KNOWLEDGE_GRAPH = {
  appName: "9FIT PRO — High-Performance OS",
  routes: [
    {
      path: "/9fit/hub",
      name: "Hub Central do Atleta",
      description: "Visão 360 do estado do atleta, score de prontidão, missões ativas, cartões de biometria e atalhos rápidos.",
      primaryEntities: ["HeroSync", "HubMissions", "HubRonCard", "FitOSConsoleDock", "EcosystemGrid"]
    },
    {
      path: "/9fit/train",
      name: "Central de Treino",
      description: "Execução de treinos do dia, séries, contagem de repetições, cronômetro de descanso, RPE e histórico de carga.",
      primaryEntities: ["WorkoutHome", "WorkoutExecution", "QuickTrainModal"]
    },
    {
      path: "/9fit/move",
      name: "MOVE — Corrida & GPS Google Maps",
      description: "Rastreamento em tempo real com Google Maps, gravação de velocidade (km/h), tempo, distância (km), ritmo e detecção da rua atual com Geocoder.",
      primaryEntities: ["NineFitMove", "GoogleMapsGPS", "RealtimeStreetGeocoder"]
    },
    {
      path: "/9fit/diet",
      name: "Nutrição & Dieta",
      description: "Diário alimentar, Scanner de Alimentos IA (visão computacional para prato e rótulo), balanço de macronutrientes (Proteína, Carboidrato, Gordura), calorias e hidratação.",
      primaryEntities: ["NutritionLogForm", "FoodScannerModal", "HydrationTracker"]
    },
    {
      path: "/9fit/recovery",
      name: "Recuperação & Prontidão (HRV)",
      description: "Check-in corporal, registro de sono, variabilidade da frequência cardíaca, estresse neuromuscular e protocolos de recuperação ativa.",
      primaryEntities: ["CheckinCorporalCard", "RecoveryMission", "EmojiCalibrationQuiz"]
    },
    {
      path: "/9fit/progress",
      name: "Evolução & Biometria",
      description: "Radar de habilidades 3D, gráfico histórico de score, tendência de percentual de gordura corporal, peso e recordes pessoais.",
      primaryEntities: ["WeeklyRadar3D", "ProgressChart", "RecordesSection"]
    },
    {
      path: "/9fit/perfil",
      name: "Perfil do Atleta & Conexões",
      description: "Digital ID do atleta, sincronização de wearables (Apple Watch, Garmin, Fitbit, Whoop), status do plano PRIME e configurações.",
      primaryEntities: ["PersonalIDCard", "WearableConnectBox", "PrimePassHub"]
    },
    {
      path: "/9fit/ron",
      name: "Centro Neural RON (Gemini Bot)",
      description: "Assistente de IA residente com modelo Gemini 3.8 Flash, comandos por voz, integração Google Agenda e concierge operacional.",
      primaryEntities: ["RonChat", "RonCalendarModal", "VoiceInterface"]
    },
    {
      path: "/students",
      name: "Gestão de Alunos (Área do Treinador)",
      description: "Painel para personais e coaches acompanharem a periodização e execução dos alunos.",
      primaryEntities: ["StudentsManagement", "StudentsList"]
    },
    {
      path: "/training-adjustments",
      name: "Smart Treino — Ajustes de Prescrição",
      description: "Central analítica com detecção preditiva de desvios, dores e recomendações automáticas de treino.",
      primaryEntities: ["TrainingAdjustmentsPage"]
    },
    {
      path: "/ecosystem",
      name: "Ecossistema de Módulos 9FIT",
      description: "Acesso a Healthflix (aulas), Loja Oficial, Módulo de Eventos e 9ZAP.",
      primaryEntities: ["EcosystemGrid", "Healthflix", "Store"]
    }
  ],
  capabilities: [
    "Google Calendar Sync em tempo real para treinos e sessões de recovery",
    "Adaptação de treinos por dor ou fadiga com sugestão imediata de substituição biomecânica",
    "Monitoramento nutricional com cálculo de janela de glicogênio e balanço de macros",
    "Controle hídrico inteligente baseado no peso do atleta (35-40ml/kg)",
    "Análise multimodal de biometria correlacionando sono, HRV e progressão de carga"
  ]
};

/**
 * Cache local e sincronização de dados operacionais rápidos
 */
const STORAGE_KEYS = {
  WATER_LOG: "9fit_daily_water_ml",
  PAIN_POINTS: "9fit_active_pain_points",
  CUSTOM_MEALS: "9fit_custom_meals_log",
  COMPLETED_MISSIONS: "9fit_completed_missions_cache"
};

/**
 * Obter estado de dados operacionais locais
 */
export function getRonOperationalData() {
  try {
    const water = parseInt(localStorage.getItem(STORAGE_KEYS.WATER_LOG) || "0", 10);
    const painPoints: string[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAIN_POINTS) || "[]");
    const customMeals: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_MEALS) || "[]");
    const completedMissions: string[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_MISSIONS) || "[]");

    return {
      waterMl: isNaN(water) ? 0 : water,
      painPoints,
      customMeals,
      completedMissions
    };
  } catch (e) {
    return {
      waterMl: 0,
      painPoints: [],
      customMeals: [],
      completedMissions: []
    };
  }
}

/**
 * Executa uma ação operacional disparada pelo RON
 */
export async function executeRonAction(
  action: RonAction,
  options?: {
    navigate?: (path: string) => void;
    onCalendarOpen?: (params?: any) => void;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    const { type, payload = {} } = action;

    switch (type) {
      case "NAVIGATE": {
        const target = payload.path || "/9fit/hub";
        if (options?.navigate) {
          options.navigate(target);
          toast.info(`Navegando para ${target}`);
        } else {
          window.location.hash = target;
        }
        return { success: true, message: `Navegação realizada para ${target}` };
      }

      case "SCHEDULE_CALENDAR": {
        if (options?.onCalendarOpen) {
          options.onCalendarOpen(payload);
        } else {
          // Dispara evento global para o modal de calendário abrir em qualquer lugar
          emitNexus("9fit:ron:open-calendar", payload);
          window.dispatchEvent(new CustomEvent("9fit:open-calendar-modal", { detail: payload }));
        }
        return { success: true, message: "Modal de agendamento na Google Agenda acionado." };
      }

      case "SYNC_WEEK_CALENDAR": {
        const token = getAccessToken();
        if (!token) {
          toast.error("Conecte sua Google Agenda no topo do RON antes de sincronizar.");
          return { success: false, message: "Google Agenda desconectada." };
        }
        const defaultSchedule = [
          { title: "Treino A — Peito, Tríceps & Ombros", dayOffset: 1, hour: 8, durationMinutes: 60 },
          { title: "Treino B — Costas, Bíceps & Core", dayOffset: 2, hour: 8, durationMinutes: 60 },
          { title: "Treino C — Pernas Completo & Glúteos", dayOffset: 4, hour: 8, durationMinutes: 70 },
          { title: "Recovery Ativo & Mobilidade", dayOffset: 5, hour: 9, durationMinutes: 30 }
        ];
        try {
          await syncWeeklyWorkouts(token, defaultSchedule);
          toast.success("Todos os treinos da semana foram sincronizados na sua Google Agenda!");
          return { success: true, message: "Semana sincronizada com sucesso no Google Calendar." };
        } catch (e: any) {
          toast.error("Falha ao sincronizar semana com Google Calendar.");
          return { success: false, message: e?.message || "Erro no Google Calendar." };
        }
      }

      case "START_WORKOUT": {
        if (options?.navigate) {
          options.navigate("/9fit/train");
        }
        emitNexus("9fit:workout:start", payload);
        toast.success("Sessão de treino iniciada com acompanhamento do RON!");
        return { success: true, message: "Treino iniciado." };
      }

      case "LOG_WATER": {
        const amount = payload.amountMl || 250;
        const current = parseInt(localStorage.getItem(STORAGE_KEYS.WATER_LOG) || "0", 10);
        const next = Math.max(0, current + amount);
        localStorage.setItem(STORAGE_KEYS.WATER_LOG, next.toString());
        
        emitNexus("9fit:water:updated", { totalMl: next, addedMl: amount });
        window.dispatchEvent(new CustomEvent("9fit:water-updated", { detail: { totalMl: next } }));
        
        toast.success(`+${amount}ml de água registrados! Total hoje: ${next}ml`);
        return { success: true, message: `Hidratação atualizada para ${next}ml` };
      }

      case "LOG_NUTRITION": {
        const currentMeals = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_MEALS) || "[]");
        const newMeal = {
          id: `meal_${Date.now()}`,
          name: payload.mealName || "Refeição Registrada",
          time: payload.time || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          calories: payload.calories || 450,
          protein: payload.protein || 35,
          carbs: payload.carbs || 45,
          fats: payload.fats || 12,
          created_at: new Date().toISOString()
        };
        currentMeals.unshift(newMeal);
        localStorage.setItem(STORAGE_KEYS.CUSTOM_MEALS, JSON.stringify(currentMeals));

        emitNexus("9fit:nutrition:logged", newMeal);
        window.dispatchEvent(new CustomEvent("9fit:nutrition-updated", { detail: newMeal }));

        toast.success(`Refeição "${newMeal.name}" adicionada ao diário nutricional!`);
        return { success: true, message: "Refeição registrada com sucesso." };
      }

      case "DELETE_NUTRITION": {
        const currentMeals = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_MEALS) || "[]");
        const mealId = payload.mealId;
        const filtered = mealId 
          ? currentMeals.filter((m: any) => m.id !== mealId)
          : currentMeals.slice(1); // remove última se não especificada
        
        localStorage.setItem(STORAGE_KEYS.CUSTOM_MEALS, JSON.stringify(filtered));
        emitNexus("9fit:nutrition:deleted", { mealId });
        window.dispatchEvent(new CustomEvent("9fit:nutrition-updated", { detail: { deleted: true } }));

        toast.info("Refeição removida do diário nutricional.");
        return { success: true, message: "Refeição removida." };
      }

      case "REGISTER_PAIN": {
        const region = payload.region || "Geral";
        const intensity = payload.intensity || 5;
        const painPoints: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAIN_POINTS) || "[]");
        
        const entry = {
          id: `pain_${Date.now()}`,
          region,
          intensity,
          date: new Date().toISOString(),
          adaptationSuggested: getBiomechanicalSubstitution(region)
        };
        painPoints.push(entry);
        localStorage.setItem(STORAGE_KEYS.PAIN_POINTS, JSON.stringify(painPoints));

        // Interliga imediatamente com a prescrição do treino
        emitNexus("9fit:pain:registered", entry);
        window.dispatchEvent(new CustomEvent("9fit:pain-registered", { detail: entry }));

        toast.warning(
          `Alerta de dor registrado em [${region}]. RON ajustou os treinos para proteger a articulação.`,
          { duration: 6000 }
        );
        return { success: true, message: `Dor em ${region} registrada e adaptações aplicadas.` };
      }

      case "CLEAR_PAIN": {
        localStorage.setItem(STORAGE_KEYS.PAIN_POINTS, JSON.stringify([]));
        emitNexus("9fit:pain:cleared", {});
        window.dispatchEvent(new CustomEvent("9fit:pain-cleared", { detail: {} }));
        toast.success("Histórico de dores reiniciado. Bloqueios articulares liberados.");
        return { success: true, message: "Histórico de dor zerado." };
      }

      case "TRIGGER_RECOVERY": {
        emitNexus("9fit:recovery:triggered", payload);
        toast.success("Protocolo de Recuperação Ativa ativado! Reduzindo carga e estresse neuromuscular.");
        if (options?.navigate) {
          options.navigate("/9fit/recovery");
        }
        return { success: true, message: "Protocolo de recuperação iniciado." };
      }

      case "COMPLETE_MISSION": {
        const missionId = payload.missionId || "daily_sync";
        const missions: string[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_MISSIONS) || "[]");
        if (!missions.includes(missionId)) {
          missions.push(missionId);
          localStorage.setItem(STORAGE_KEYS.COMPLETED_MISSIONS, JSON.stringify(missions));
        }
        emitNexus("9fit:mission:completed", { missionId, xp: 50 });
        toast.success("+50 XP! Missão concluída com validação do RON.");
        return { success: true, message: "Missão finalizada." };
      }

      default:
        return { success: true, message: `Ação ${type} processada.` };
    }
  } catch (error: any) {
    console.error("[RonOperationalCore] Erro ao executar ação:", error);
    toast.error("Não foi possível executar a ação solicitada.");
    return { success: false, message: error?.message || "Erro desconhecido." };
  }
}

/**
 * Interliga uma dor articular com a substituição biomecânica recomendada
 */
export function getBiomechanicalSubstitution(region: string): string {
  const norm = region.toLowerCase();
  if (norm.includes("ombro")) {
    return "Substituir Supino Barra por Supino com Halteres Pegada Neutra ou Apoio no Chão (Floor Press). Evitar elevação lateral acima de 90° e puxada atrás da nuca.";
  }
  if (norm.includes("lombar") || norm.includes("costas")) {
    return "Substituir Levantamento Terra e Agachamento Livre por Leg Press 45° com suporte total e Remada com Peito Apoiado no Banco (Chest-Supported Row).";
  }
  if (norm.includes("joelho")) {
    return "Substituir Cadeira Extensora pesada por Agachamento Caixa (Box Squat) com tíbia vertical e Elevação Pélvica com foco em isquiotibiais e glúteos.";
  }
  if (norm.includes("cotovelo")) {
    return "Substituir Tríceps Testa barra reta por Tríceps Corda no cross com cotovelos estáveis e rosca bíceps martelo.";
  }
  return "Reduzir carga em 25%, aumentar tempo sob tensão com cadência 3-1-2 e limitar amplitude de movimento.";
}

/**
 * Análise Biomecânica e Interligação Global do Atleta
 */
export function analyzeAthleteHolistic(data: {
  state: string;
  syncScore: number;
  waterMl?: number;
  painPoints?: string[];
  activeWorkoutCount?: number;
}): RonAnalysisResult {
  const { state, syncScore, waterMl = 0, painPoints = [] } = data;
  const recommendations: string[] = [];

  let fatigueRisk: "baixo" | "moderado" | "alto" | "critico" = "baixo";

  if (syncScore < 50 || state === "low") {
    fatigueRisk = "alto";
    recommendations.push("Prontidão neuromotora deprimida: priorizar treinos regenerativos ou RPE máximo 6.5.");
    recommendations.push("Aumentar ingestão de água e micronutrientes antioxidantes.");
  } else if (syncScore >= 80 || state === "power") {
    fatigueRisk = "baixo";
    recommendations.push("Estado POWER detectado: excelente dia para testar progressão de carga ou novo recorde pessoal (PR).");
  } else {
    fatigueRisk = "moderado";
    recommendations.push("Estado equilibrado: mantenha as faixas prescritas de hipertrofia com 2 a 3 repetições de reserva.");
  }

  if (waterMl < 1500) {
    recommendations.push(`Ingestão de água baixa hoje (${waterMl}ml). Risco de queda de até 15% na força de pico e maior estresse articular.`);
  }

  if (painPoints.length > 0) {
    recommendations.push(`Atenção às regiões de dor ativas: ${painPoints.join(", ")}. Adaptações biomecânicas estão ativas no seu plano.`);
  }

  return {
    biometricSummary: `Sincronia geral em ${syncScore}% com índice de prontidão no nível ${state.toUpperCase()}.`,
    readinessScore: syncScore,
    fatigueRisk,
    interlinkedRecommendations: recommendations
  };
}
