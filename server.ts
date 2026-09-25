import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize Gemini client strictly using @google/genai and User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Google Maps client config endpoint
app.get('/api/config/maps', (req, res) => {
  const apiKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    'AIzaSyDdsMhbF8C6KTht4vbqPcBvxHNAdM3doh4';
  res.json({ apiKey });
});

// Gemini Bot Chat Endpoint for RON
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, history = [], context = {} } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem inválida ou ausente.' });
    }

    const {
      athleteName,
      state = 'balanced',
      stateLabel = 'Equilibrado',
      syncScore,
      remainingCredits,
      calendarConnected,
      currentPage = '/9fit/hub',
    } = context;

    const systemInstruction = `Você é o RON, o Centro de Inteligência, Guia Operacional, Concierge e Neural Coach oficial do 9FIT PRO.
Você conhece TODO o aplicativo 9FIT PRO em detalhes, incluindo todas as telas, rotas, entidades e recursos operacionais:

MAPA DO APP:
- /9fit/hub: Hub central, visão 360 do atleta, HeroSync, missões ativas, cartões de biometria.
- /9fit/train: Execução de treinos, cronômetro de descanso, séries, repetições, RPE, histórico de cargas.
- /9fit/move: Corrida e caminhada com Google Maps em tempo real, GPS ativo, gravação de velocidade (km/h), tempo, distância e nome da rua via Geocoder.
- /9fit/diet: Diário de nutrição, balanço de macronutrientes (Proteína, Carboidrato, Gordura), calorias e hidratação.
- /9fit/recovery: Prontidão, HRV, check-in corporal, qualidade do sono, calibração emocional e protocolos de recuperação ativa.
- /9fit/progress: Evolução biométrica, Radar 3D de habilidades, gráfico de score histórico, % de gordura e recordes pessoais (PRs).
- /9fit/perfil: Perfil do atleta, Digital ID, sincronização de wearables (Apple Watch, Garmin, Whoop), plano PRIME.
- /9fit/ron: Centro de conversação e comando neural com você (Gemini Bot) e integração de voz e Google Agenda.
- /students: Painel do Treinador para acompanhamento e gestão de alunos e periodizações.
- /training-adjustments: Smart Treino com ajustes preditivos de treino e relatórios de sobrecarga.
- /ecosystem: Ecossistema com Healthflix (aulas em vídeo) e Loja de Suplementos/Equipamentos.

SUAS RESPONSABILIDADES:
1. EXECUTAR: Iniciar treinos, sincronizar ou agendar treinos na Google Agenda, disparar protocolos de recuperação, marcar missões completas.
2. CRIAR: Registrar refeições no diário, adicionar água consumida (+250ml, +500ml), registrar pontos de dor com adaptação biomecânica.
3. APAGAR: Excluir refeições do log, limpar histórico de dor, resetar alertas quando resolvidos.
4. RELACIONAR / INTERLIGAR:
   - Se o atleta relata dor (ex: ombro, joelho, lombar), interligue imediatamente com o treino, sugerindo substituições biomecânicas (ex: supino barra -> halteres pegada neutra; agachamento -> leg press ou box squat).
   - Se o treino está agendado na Google Agenda, calcule a janela ideal da refeição pré-treino e hidratação.
   - Se a prontidão (HRV/Sono) estiver baixa (<60%), recomende redução de volume ou dia regenerativo.
5. ANALISAR, SUGERIR E OPINAR: Dê opiniões técnicas embasadas em fisiologia esportiva de elite com linguagem direta, motivadora e brasileira.

DADOS DO ATLETA ATUAL:
- Nome: ${athleteName || 'Atleta'}
- Tela Atual do Atleta: ${currentPage}
- Estado Biométrico: ${stateLabel} (${state})
- Pontuação de Sincronia / Prontidão: ${syncScore !== null && syncScore !== undefined ? `${syncScore}%` : '85% (Calibrado)'}
- Fichas de Ação: ${remainingCredits ?? 'Livre'}
- Google Calendar: ${calendarConnected ? 'Conectado e Ativo' : 'Não conectado'}

FORMATO DE AÇÃO OPERACIONAL:
Se o atleta solicitar uma ação (navegar, agendar, iniciar treino, adicionar refeição, beber água, reportar dor, etc.), responda com entusiasmo e no final do seu texto adicione uma tag de ação JSON no seguinte formato:
<<<RON_ACTIONS[{"type":"NAVIGATE|SCHEDULE_CALENDAR|SYNC_WEEK_CALENDAR|START_WORKOUT|LOG_NUTRITION|DELETE_NUTRITION|LOG_WATER|REGISTER_PAIN|TRIGGER_RECOVERY|COMPLETE_MISSION","title":"Título da Ação","payload":{}}]RON_ACTIONS>>>`;

    // Map conversation history into contents format
    const contents: any[] = [];

    // Add prior turns
    if (Array.isArray(history)) {
      for (const turn of history.slice(-12)) {
        const role = turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user';
        if (turn.content && typeof turn.content === 'string') {
          contents.push({
            role,
            parts: [{ text: turn.content }],
          });
        }
      }
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    let reply = '';
    const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response.text) {
          reply = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Bot] Model ${model} returned:`, err?.message || err);
      }
    }

    // Extract actions from reply if present
    const actions: any[] = [];
    const actionRegex = /<<<RON_ACTIONS([\s\S]*?)RON_ACTIONS>>>/;
    const match = reply.match(actionRegex);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (Array.isArray(parsed)) {
          actions.push(...parsed);
        } else if (parsed && typeof parsed === 'object') {
          actions.push(parsed);
        }
      } catch (e) {
        console.warn('[Gemini Server] Could not parse action JSON:', e);
      }
      reply = reply.replace(actionRegex, '').trim();
    }

    // Graceful fallback and operational action generation if external model is temporarily at capacity
    if (!reply) {
      const lower = message.toLowerCase();
      const stateLabel = context.stateLabel || 'Equilibrado';
      const name = context.athleteName || 'Atleta';

      if (lower.includes('agenda') || lower.includes('calendar') || lower.includes('agendar') || lower.includes('marcar')) {
        reply = `Com certeza, ${name}! Estou preparado para sincronizar e gerenciar seus treinos diretamente na Google Agenda. Você pode escolher os parâmetros no modal de agendamento ou confirmar abaixo.`;
        actions.push({
          type: 'SCHEDULE_CALENDAR',
          title: 'Agendar na Google Agenda',
          description: 'Criar evento de treino com lembrete inteligente no Google Calendar',
          payload: { summary: '9FIT Treino — Sessão de Força', durationMinutes: 60 }
        });
      } else if (lower.includes('sincronizar') || lower.includes('semana')) {
        reply = `Excelente, ${name}! Manter a rotina sincronizada no Google Calendar garante a consistência do seu microciclo. Clique abaixo para enviar toda a grade de treinos da semana de uma vez.`;
        actions.push({
          type: 'SYNC_WEEK_CALENDAR',
          title: 'Auto-Sync Semana Completa',
          description: 'Exportar os 4 treinos da semana para sua Google Agenda'
        });
      } else if (lower.includes('dor') || lower.includes('machuc') || lower.includes('lesao') || lower.includes('ombro') || lower.includes('joelho') || lower.includes('lombar')) {
        let region = 'Ombro';
        if (lower.includes('joelho')) region = 'Joelho';
        if (lower.includes('lombar') || lower.includes('costas')) region = 'Lombar';
        reply = `Alerta de sobrecarga registrado, ${name}. Quando há desconforto em [${region}], a regra número 1 é integridade articular. Já calculei as substituições biomecânicas no seu treino para não sobrecarregar as estruturas passivas.`;
        actions.push({
          type: 'REGISTER_PAIN',
          title: `Registrar Alerta em ${region}`,
          description: 'Ajustar prescrição do dia substituindo exercícios lesivos',
          payload: { region, intensity: 6 }
        });
      } else if (lower.includes('agua') || lower.includes('hidrat')) {
        reply = `Hidratação é o combustível da bomba de sódio-potássio e da transmissão neuromuscular, ${name}. Registrei seu consumo agora!`;
        actions.push({
          type: 'LOG_WATER',
          title: 'Registrar +500ml de Água',
          description: 'Adicionar 500ml ao contador diário de hidratação',
          payload: { amountMl: 500 }
        });
      } else if (lower.includes('refeic') || lower.includes('almoc') || lower.includes('jantar') || lower.includes('cafe') || lower.includes('comi')) {
        reply = `Entendido, ${name}! Registrei a refeição no seu balanço nutricional diário. Mantenha os aportes de proteína elevados para preservar a síntese proteica miofibrilar.`;
        actions.push({
          type: 'LOG_NUTRITION',
          title: 'Adicionar ao Diário Alimentar',
          description: 'Registrar refeição balanceada com 35g de proteína e 450 kcal',
          payload: { mealName: 'Refeição Registrada por Voz com RON', calories: 450, protein: 35, carbs: 45, fats: 12 }
        });
      } else if (lower.includes('iniciar') || lower.includes('comecar') || (lower.includes('treino') && lower.includes('hoje'))) {
        reply = `Excelente! O treino do dia está pronto no protocolo. Foco na cadência excêntrica controlada e no RPE prescrito.`;
        actions.push({
          type: 'START_WORKOUT',
          title: 'Iniciar Treino Agora',
          description: 'Abrir execução com cronômetro de descanso do RON'
        });
      } else if (lower.includes('recovery') || lower.includes('recupera') || lower.includes('sono') || lower.includes('descanso')) {
        reply = `Seus sinais biométricos indicam que você está em modo ${stateLabel}. Para restaurar a homeostase do sistema nervoso parassimpático, recomendo respiração ritmada 4-7-8 e alongamento ativo.`;
        actions.push({
          type: 'TRIGGER_RECOVERY',
          title: 'Ativar Protocolo de Recuperação',
          description: 'Navegar para a central de prontidão e mobilidade'
        });
      } else if (lower.includes('corrid') || lower.includes('correr') || lower.includes('move') || lower.includes('gps') || lower.includes('caminhada')) {
        reply = `Perfeito, ${name}! O 9FIT MOVE está equipado com Google Maps em tempo real, rastreamento de GPS, velocidade, distância, tempo e identificação automática da rua por Geocoder. Vamos iniciar sua corrida!`;
        actions.push({
          type: 'NAVIGATE',
          title: 'Abrir 9FIT MOVE & Ligar GPS',
          description: 'Iniciar corrida com mapa Google Maps e telemetria',
          payload: { path: '/9fit/move' }
        });
      } else if (lower.includes('progresso') || lower.includes('evoluc') || lower.includes('recorde')) {
        reply = `Seus dados de evolução mostram consistência no ciclo atual. Veja os detalhes no seu Radar 3D e gráfico histórico de performance.`;
        actions.push({
          type: 'NAVIGATE',
          title: 'Ver Radar 3D de Evolução',
          description: 'Abrir tela de progresso e biometria',
          payload: { path: '/9fit/progress' }
        });
      } else {
        reply = `Olá, ${name}! Sou o RON, seu Concierge e Centro de Inteligência 360 no 9FIT PRO. Estou monitorando seus treinos, nutrição, recuperação e agenda em tempo real no modo ${stateLabel}. O que deseja que eu execute ou analise agora?`;
      }
    }

    return res.json({
      role: 'assistant',
      content: reply,
      actions,
    });
  } catch (error: any) {
    console.error('[Gemini API Server Error]:', error);
    return res.status(500).json({
      error: 'Erro no servidor do Gemini Bot.',
      details: error?.message || 'Falha ao processar solicitação.',
    });
  }
});

// Mount Vite or serve static files
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
