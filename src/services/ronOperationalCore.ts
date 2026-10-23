import { recordRonAction } from "./ronRecords";
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
import { supabase } from "@/integrations/supabase/client";
import { businessDate } from "@/services/dailyContextRules";

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
        if(typeof target!=='string' || !target.startsWith('/9fit/') || target.includes('\\')) throw new Error('Destino inválido.');
        if (options?.navigate) {
          options.navigate(target);
          toast.info(`Navegando para ${target}`);
        } else {
          window.location.assign(target);
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
        if (options?.onCalendarOpen) options.onCalendarOpen();
        else options?.navigate?.('/9fit/aulas-creditos');
        return { success: true, message: 'Confira os compromissos confirmados antes de sincronizar.' };
      }
      case "START_WORKOUT": {
        options?.navigate?.('/9fit/train');
        return {success:true,message:'Abra a sessão prescrita para iniciar o treino.'};
      }
      case "LOG_WATER": case "LOG_NUTRITION": case "DELETE_NUTRITION": case "REGISTER_PAIN": {
        action.id ||= crypto.randomUUID();
        await recordRonAction(type,payload,action.id);
        const message=type==='LOG_WATER'?'Água registrada no seu diário.':type==='LOG_NUTRITION'?'Refeição registrada no seu diário.':type==='DELETE_NUTRITION'?'Remoção confirmada no diário.':'Relato registrado. Revise a atividade com seu profissional; a prescrição não foi alterada.';
        toast.success(message); return {success:true,message};
      }
      case "CLEAR_PAIN": {
        options?.navigate?.('/9fit/ajuste-treino');
        return {success:true,message:'Revise os relatos com seu profissional. O histórico foi preservado.'};
      }
      case "TRIGGER_RECOVERY": {
        options?.navigate?.('/9fit/recovery');
        return {success:true,message:'Abrindo o módulo de recuperação. Nenhuma carga foi alterada.'};
      }
      case "COMPLETE_MISSION": {
        options?.navigate?.('/9fit/progresso/historico');
        return {success:true,message:'Confira as atividades confirmadas no histórico. Nenhum XP foi concedido por esta ação.'};
      }
      case "ADJUST_TRAINING_VOLUME": {
        const { data: currentAthleteId, error: identityError } = await supabase.rpc("fn_current_athlete_id");
        if (identityError || !currentAthleteId) throw new Error("Não consegui confirmar seu perfil de atleta.");
        const date = businessDate();
        const { data: workout, error: workoutError } = await supabase
          .from("daily_workouts")
          .select("id,day_name")
          .eq("athlete_id", currentAthleteId)
          .eq("workout_date", date)
          .neq("workout_type", "quick")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (workoutError) throw workoutError;
        if (!workout) throw new Error("Não há treino prescrito para hoje. Não alterei nenhuma sessão.");

        const { data: executions, error: executionError } = await supabase
          .from("workout_executions")
          .select("status")
          .eq("athlete_id", currentAthleteId)
          .eq("daily_workout_id", workout.id)
          .in("status", ["started", "in_progress", "paused", "completed"]);
        if (executionError) throw executionError;
        if (executions?.length) throw new Error("O treino já foi iniciado ou concluído. Para proteger seus registros, o RON não alterou esta sessão.");

        const { data: rows, error: exerciseError } = await supabase
          .from("workout_exercises")
          .select("exercise_id,sets")
          .eq("daily_workout_id", workout.id);
        if (exerciseError) throw exerciseError;
        const changes = (rows || [])
          .filter((row) => Number(row.sets || 1) > 1)
          .map((row) => ({ exercise_id: row.exercise_id, sets: Number(row.sets) - 1 }));
        if (!changes.length) throw new Error("O treino já está no volume mínimo seguro; nenhuma alteração foi feita.");

        const { data: result, error: adjustmentError } = await supabase.rpc("fn_ajustar_treino_dia" as any, {
          p_athlete_id: currentAthleteId,
          p_data: date,
          p_changes: changes,
        });
        if (adjustmentError) throw adjustmentError;
        if ((result as any)?.success === false) throw new Error((result as any)?.error || "O ajuste não foi aplicado.");
        window.dispatchEvent(new Event("9fit:workout-updated"));
        window.dispatchEvent(new Event("9fit:sync_updated"));
        toast.success(`Volume de ${workout.day_name || "treino de hoje"} ajustado: uma série a menos por exercício aplicável.`);
        return { success: true, message: "Ajuste aplicado ao treino de hoje." };
      }

      default:
        return { success: false, message: "Esta ação ainda não está disponível." };
    }
  } catch (error: any) {
    console.error("[RonOperationalCore] Erro ao executar ação:", error);
    toast.error(action.type === "ADJUST_TRAINING_VOLUME" && error?.message ? error.message : "Não foi possível executar a ação solicitada.");
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
