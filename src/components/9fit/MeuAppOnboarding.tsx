import { useEffect, useState } from "react";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";

/**
 * Onboarding guiado do app (Perfil > Meu app > Onboarding).
 * Para publicar um vídeo: preencha `videoUrl` do módulo com a URL do arquivo (mp4/webm).
 * Enquanto estiver null, o módulo mostra "Vídeo em breve".
 */
type OnboardingModule = {
  id: string;
  title: string;
  desc: string;
  duration: string;
  videoUrl: string | null;
};

const MODULES: OnboardingModule[] = [
  { id: "inicio-sync", title: "Início e SYNC", desc: "Como ler o Comando do dia e o score de sincronia.", duration: "2 min", videoUrl: null },
  { id: "registros", title: "Registrar treino, refeição e água", desc: "Os registros que alimentam o seu ciclo de dados.", duration: "3 min", videoUrl: null },
  { id: "train", title: "Train: hoje, semana e protocolo", desc: "Como abrir, ajustar e concluir sua sessão.", duration: "3 min", videoUrl: null },
  { id: "hub", title: "Hub e ecossistema", desc: "Atalhos, módulos e comunidade em um só lugar.", duration: "2 min", videoUrl: null },
  { id: "ron", title: "RON IA", desc: "Perguntar, registrar sinais e usar a voz.", duration: "2 min", videoUrl: null },
  { id: "progresso", title: "Histórico e avaliações", desc: "Acompanhar evolução e registrar reavaliações.", duration: "3 min", videoUrl: null },
];

const STORAGE_KEY = "9fit:meu-app-onboarding";

function readDone(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function MeuAppOnboarding() {
  const [done, setDone] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(MODULES[0].id);

  useEffect(() => setDone(readDone()), []);

  const toggleDone = (id: string) => {
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* armazenamento indisponível: segue só em memória */
      }
      return next;
    });
  };

  const pct = Math.round((done.length / MODULES.length) * 100);

  return (
    <section className="px-4 space-y-4" aria-label="Onboarding guiado">
      <div className="glass-mission rounded-2xl p-4">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[9px] font-data tracking-[0.3em] text-primary/80">ONBOARDING GUIADO</p>
          <p className="text-[11px] font-mono text-muted-foreground tabular-nums">{done.length}/{MODULES.length} · {pct}%</p>
        </div>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Aprenda a usar cada parte do app em vídeos curtos.</p>
      </div>

      <ul className="space-y-2">
        {MODULES.map((m, i) => {
          const complete = done.includes(m.id);
          const open = openId === m.id;
          return (
            <li key={m.id} className="glass-mission rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : m.id)}
                aria-expanded={open}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/15 grid place-items-center text-xs font-display text-primary">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display uppercase text-foreground truncate">{m.title}</p>
                  <p className="text-[10px] text-muted-foreground">{m.duration}</p>
                </div>
                {complete ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : <Circle className="w-5 h-5 text-white/35 shrink-0" />}
              </button>

              {open && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                  {m.videoUrl ? (
                    <video src={m.videoUrl} controls playsInline preload="metadata" className="w-full rounded-xl bg-black aspect-video" />
                  ) : (
                    <div className="w-full aspect-video rounded-xl bg-black/40 border border-primary/15 grid place-items-center">
                      <div className="text-center">
                        <PlayCircle className="w-8 h-8 text-primary/60 mx-auto" />
                        <p className="mt-1 text-[10px] font-data tracking-[0.25em] text-muted-foreground">VÍDEO EM BREVE</p>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleDone(m.id)}
                    className={`w-full min-h-11 rounded-xl text-[11px] font-display uppercase tracking-widest transition-all ${
                      complete ? "border border-primary/30 text-primary" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {complete ? "Marcar como não visto" : "Marcar como visto"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
