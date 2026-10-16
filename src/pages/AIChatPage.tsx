import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, Loader2, Trash2, Sparkles, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Quais dados deste aluno faltam para revisar o treino?',
  'Que pontos da evolução deste aluno merecem atenção?',
  'Quais perguntas devo fazer antes de ajustar a periodização?',
  'Resuma o contexto disponível deste aluno.',
];

export default function AIChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const athleteId = new URLSearchParams(location.search).get('athleteId');
  const [athlete, setAthlete] = useState<{id: string; name: string} | null>(null);
  const [athleteLoading, setAthleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    let active = true;
    requestVersion.current += 1;
    setAthlete(null);
    setMessages([]);
    setError('');
    setIsLoading(false);
    if (!athleteId) return () => { active = false; };
    setAthleteLoading(true);
    void supabase.from('athletes').select('id,name').eq('id', athleteId).maybeSingle().then(({data, error: lookupError}) => {
      if (!active) return;
      if (lookupError || !data) setError('Aluno indisponível ou sem acesso. Selecione outro aluno.');
      else setAthlete(data);
      setAthleteLoading(false);
    });
    return () => { active = false; };
  }, [athleteId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading || !athlete) return;
    const version = ++requestVersion.current;

    const userMsg: Message = { role: 'user', content: messageText };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setError('');
    setIsLoading(true);

    try {
      const { data: response, error: invokeError } = await supabase.functions.invoke('ai-coach', {
        body: { mode: 'chat', athleteId: athlete.id, messages: allMessages.slice(-30) },
      });
      if (invokeError || response?.success !== true || typeof response?.data?.content !== 'string' || !response.data.content.trim()) throw invokeError ?? new Error(response?.error?.message || 'Resposta inválida da IA');
      if (version === requestVersion.current) setMessages(previous => [...previous, { role: 'assistant', content: response.data.content.trim() }]);
    } catch (err: any) {
      if (version === requestVersion.current) setError(err?.message || 'Não foi possível conectar ao assistente IA.');
    } finally {
      if (version === requestVersion.current) { setIsLoading(false); inputRef.current?.focus(); }
    }
  };

  const clearChat = () => {
    requestVersion.current += 1;
    setMessages([]);
    setError('');
    setIsLoading(false);
  };

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assistente IA</h1>
            <p className="text-sm text-muted-foreground">{athlete ? `Contexto do aluno: ${athlete.name}` : athleteLoading ? 'Carregando aluno…' : 'Selecione um aluno para iniciar a conversa.'}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearChat}>
            <Trash2 className="w-4 h-4 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {!athleteId && <Button variant="outline" className="self-start" onClick={() => navigate('/app/alunos')}><Users className="w-4 h-4 mr-2" />Escolher aluno</Button>}
      {error && <div role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Como posso ajudar?</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Pergunte sobre o contexto disponível deste aluno. O assistente sugere caminhos; a decisão e a prescrição são do professor.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {SUGGESTIONS.map((s, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs text-left h-auto py-3 px-4 whitespace-normal"
                    onClick={() => sendMessage(s)}
                    disabled={!athlete || isLoading}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="p-4 border-t">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte algo ao assistente..."
              disabled={isLoading || !athlete}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !athlete || !input.trim()} size="icon">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
