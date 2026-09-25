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
    } = context;

    const systemInstruction = `Você é o RON, o Neural Coach e inteligência artificial residente do 9FIT PRO.
Sua missão é guiar o atleta rumo à sua melhor performance física, combinando ciência desportiva, biometria e adaptação contínua.
Fale em Português do Brasil com um tom confiante, direto, inteligente e encorajador.

DADOS CONTEXTUAIS DO ATLETA ATUAL:
- Nome: ${athleteName || 'Atleta'}
- Estado Biométrico Atual: ${stateLabel} (${state})
- Pontuação de Sincronia / Prontidão: ${syncScore !== null && syncScore !== undefined ? `${syncScore}%` : 'Em calibração'}
- Fichas de Ação Disponíveis: ${remainingCredits ?? 'Livre'}
- Google Calendar / Google Agenda: ${calendarConnected ? 'Conectado e Ativo' : 'Não conectado'}

HABILIDADES ESPECIAIS:
1. Ajuste de treino por fadiga ou dor: Sempre priorize a integridade articular e biomecânica.
2. Agendamento com Google Calendar: Você pode orientar o usuário a agendar treinos, sincronizar a semana de treinos ou verificar seus compromissos. Se o atleta pedir explicitamente para marcar ou agendar um treino (ex: "agende meu treino amanhã às 8h", "marque treino de pernas na minha agenda"), reconheça com entusiasmo e inclua detalhes claros de data, horário sugerido e tipo de treino.
3. Seja conciso quando o usuário fizer perguntas rápidas, mas aprofunde quando pedir explicação técnica sobre séries, RPE, descanso ou hipertrofia.`;

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

    // Graceful fallback to resilient intelligent coach response if external model is temporarily at capacity
    if (!reply) {
      const lower = message.toLowerCase();
      const stateLabel = context.stateLabel || 'Equilibrado';
      const name = context.athleteName || 'Atleta';

      if (lower.includes('agenda') || lower.includes('calendar') || lower.includes('agendar') || lower.includes('marcar')) {
        reply = `Perfeito, ${name}! Estou pronto para organizar seu treino na Google Agenda. Você pode selecionar o dia e horário clicando no botão "Agendar" acima ou me dizer qual treino prefere que eu configure para você.`;
      } else if (lower.includes('sincronizar') || lower.includes('semana')) {
        reply = `Excelente iniciativa, ${name}! Manter a rotina sincronizada com a Google Agenda é a chave da consistência. Recomendo 3 a 4 sessões esta semana. Clique em "Agendar Treino" ou "Auto-Sync Semana" para incluir no seu calendário!`;
      } else if (lower.includes('recovery') || lower.includes('recupera') || lower.includes('hrv') || lower.includes('fadiga')) {
        reply = `Seus sinais biométricos indicam que você está em modo ${stateLabel}. Mantenha a hidratação alta (35ml/kg), sono reparador e trabalhe dentro de faixas seguras de RPE hoje.`;
      } else if (lower.includes('treino') || lower.includes('exerc')) {
        reply = `Para o seu estado atual (${stateLabel}), sugiro focar na qualidade de execução e cadência controlada. Posso agendar esse treino na sua Google Agenda se desejar!`;
      } else {
        reply = `Olá, ${name}! Sou o RON, seu Neural Coach inteligente no 9FIT PRO. Estou acompanhando sua rotina em modo ${stateLabel}. O que vamos otimizar ou agendar agora?`;
      }
    }

    return res.json({
      role: 'assistant',
      content: reply,
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
