import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Plus, RefreshCw, CalendarDays, ExternalLink, Check, Trash2, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import {
  GoogleCalendarEvent,
  createCalendarWorkoutEvent,
  listUpcomingEvents,
  syncWeeklyWorkouts,
} from '@/services/googleCalendar';

interface RonCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onOpenGoogleAuth: () => void;
  onEventCreated?: (summary: string) => void;
}

const PRESET_WORKOUTS = [
  { id: '1', title: 'Treino A - Peitoral e Deltoides', duration: 60 },
  { id: '2', title: 'Treino B - Dorsais e Bíceps', duration: 60 },
  { id: '3', title: 'Treino C - Membros Inferiores (Pernas)', duration: 75 },
  { id: '4', title: 'Treino Funcional & Core Intenso', duration: 45 },
  { id: '5', title: 'Cardio Regenerativo & Mobilidade', duration: 40 },
];

export function RonCalendarModal({
  isOpen,
  onClose,
  accessToken,
  onOpenGoogleAuth,
  onEventCreated,
}: RonCalendarModalProps) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [syncingWeek, setSyncingWeek] = useState(false);

  // Form states
  const [title, setTitle] = useState(PRESET_WORKOUTS[0].title);
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState('08:00');
  const [duration, setDuration] = useState(60);
  const [activeTab, setActiveTab] = useState<'schedule' | 'events'>('schedule');

  useEffect(() => {
    if (isOpen && accessToken) {
      loadEvents();
    }
  }, [isOpen, accessToken]);

  const loadEvents = async () => {
    if (!accessToken) return;
    setLoadingEvents(true);
    try {
      const items = await listUpcomingEvents(accessToken, 8);
      setEvents(items);
    } catch (err: any) {
      console.error('[Calendar Modal] Error loading events:', err);
      toast.error('Erro ao listar eventos do Google Agenda', {
        description: err.message || 'Verifique sua conexão ou autentique novamente.',
      });
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      toast.error('Conecte sua conta do Google primeiro.');
      onOpenGoogleAuth();
      return;
    }

    try {
      setScheduling(true);
      const startDateTime = `${date}T${time}:00`;
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

      await createCalendarWorkoutEvent(accessToken, {
        summary: title,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        description: `Treino 9FIT prescrito pelo RON AI.\nDuração: ${duration} minutos.\nFoco: Consistência e Progressão.`,
      });

      toast.success('Treino agendado com sucesso no Google Agenda!', {
        description: `${title} marcado para ${new Date(startDateTime).toLocaleDateString('pt-BR')} às ${time}.`,
      });

      if (onEventCreated) {
        onEventCreated(`${title} (${new Date(startDateTime).toLocaleDateString('pt-BR')} às ${time})`);
      }

      await loadEvents();
      setActiveTab('events');
    } catch (err: any) {
      console.error('[Calendar Modal] Create event error:', err);
      toast.error('Não foi possível agendar o treino', {
        description: err.message,
      });
    } finally {
      setScheduling(false);
    }
  };

  const handleSyncWeek = async () => {
    if (!accessToken) {
      toast.error('Conecte sua conta do Google primeiro.');
      onOpenGoogleAuth();
      return;
    }

    try {
      setSyncingWeek(true);
      const weeklyPlan = [
        { title: 'Treino A - Peitoral e Deltoides', dayOffset: 1, hour: 7, durationMinutes: 60 },
        { title: 'Treino B - Dorsais e Bíceps', dayOffset: 3, hour: 7, durationMinutes: 60 },
        { title: 'Treino C - Membros Inferiores', dayOffset: 5, hour: 8, durationMinutes: 70 },
      ];

      await syncWeeklyWorkouts(accessToken, weeklyPlan);
      toast.success('Semana sincronizada com o Google Agenda!', {
        description: '3 treinos principais foram adicionados ao seu calendário com lembretes automáticos.',
      });

      if (onEventCreated) {
        onEventCreated('Semana de Treinos (Segunda, Quarta e Sexta)');
      }

      await loadEvents();
      setActiveTab('events');
    } catch (err: any) {
      console.error('[Calendar Modal] Sync week error:', err);
      toast.error('Erro ao sincronizar semana com Google Agenda', {
        description: err.message,
      });
    } finally {
      setSyncingWeek(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-[#0f1117] border border-white/10 text-white shadow-2xl backdrop-blur-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-primary/10 border border-primary/25 text-primary">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Google Agenda // 9FIT Sync
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Agende e sincronize sessões de treino com o ecossistema Google.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!accessToken ? (
          <div className="py-6 px-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center space-y-4">
            <CalendarDays className="w-12 h-12 text-amber-400 mx-auto" />
            <div className="space-y-1">
              <h4 className="font-semibold text-white">Google Agenda Não Conectado</h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Conecte sua conta Google para permitir que o RON agende seus treinos e configure notificações no seu calendário.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenGoogleAuth();
              }}
              className="inline-flex items-center justify-center gap-3 px-5 py-2.5 rounded-xl font-medium text-xs bg-white text-neutral-900 hover:bg-neutral-100 transition-colors shadow-lg cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              Conectar com o Google
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex border-b border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 py-2 font-semibold text-center border-b-2 transition-colors ${
                  activeTab === 'schedule'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                Agendar Novo Treino
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className={`flex-1 py-2 font-semibold text-center border-b-2 transition-colors ${
                  activeTab === 'events'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                Próximos Treinos ({events.length})
              </button>
            </div>

            {activeTab === 'schedule' ? (
              <form onSubmit={handleCreateEvent} className="space-y-3.5">
                {/* Presets */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-1.5">
                    Selecione o Treino Prescrito
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {PRESET_WORKOUTS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTitle(item.title);
                          setDuration(item.duration);
                        }}
                        className={`text-left text-xs p-2 rounded-lg border transition-all flex items-center justify-between ${
                          title === item.title
                            ? 'border-primary bg-primary/10 text-white'
                            : 'border-white/5 bg-white/[0.02] text-neutral-400 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-3.5 h-3.5 text-primary" />
                          <span className="truncate">{item.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">{item.duration}m</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Title */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                    Título Customizado
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Ex: Treino de Força e Mobilidade"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-primary/60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/60"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                      Horário
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                    Duração Estimada
                  </label>
                  <div className="flex gap-2">
                    {[30, 45, 60, 75, 90].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDuration(mins)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                          duration === mins
                            ? 'border-primary bg-primary/15 text-primary font-bold'
                            : 'border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={scheduling}
                    className="flex-1 bg-primary text-primary-foreground font-semibold text-xs py-2.5 rounded-xl hover:opacity-95"
                  >
                    {scheduling ? 'Agendando...' : 'Confirmar no Google Agenda'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSyncWeek}
                    disabled={syncingWeek}
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10 text-xs py-2.5 rounded-xl font-semibold whitespace-nowrap"
                  >
                    {syncingWeek ? 'Sincronizando...' : 'Auto-Sync Semana'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Eventos sincronizados na agenda</span>
                  <button
                    type="button"
                    onClick={loadEvents}
                    disabled={loadingEvents}
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingEvents ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                </div>

                {loadingEvents ? (
                  <div className="py-8 text-center text-xs text-neutral-400 animate-pulse">
                    Consultando Google Calendar...
                  </div>
                ) : events.length === 0 ? (
                  <div className="py-8 text-center rounded-xl border border-white/5 bg-white/[0.02] text-xs text-neutral-400">
                    Nenhum evento recente encontrado nesta semana.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {events.map((ev) => {
                      const startTime = ev.start?.dateTime
                        ? new Date(ev.start.dateTime).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Dia todo';
                      const startDate = ev.start?.dateTime
                        ? new Date(ev.start.dateTime).toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })
                        : '';

                      return (
                        <div
                          key={ev.id}
                          className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <h5 className="text-xs font-semibold text-white truncate">{ev.summary}</h5>
                            <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3 text-primary" />
                              <span>{startDate} às {startTime}</span>
                              {ev.location && <span className="truncate">· {ev.location}</span>}
                            </p>
                          </div>
                          {ev.htmlLink && (
                            <a
                              href={ev.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-white/5"
                              title="Abrir no Google Agenda"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button
                  onClick={() => setActiveTab('schedule')}
                  variant="outline"
                  className="w-full border-white/10 text-xs py-2"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agendar Outro Treino
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
