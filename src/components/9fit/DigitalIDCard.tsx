import { useState } from 'react';
import { Shield, Share2, X, Pencil } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShareableCard } from '@/components/9fit/ShareableCard';
import { CompleteProfileFlow } from '@/components/9fit/CompleteProfileFlow';

interface Props {
  name: string;
  level: number;
  classTier?: string;
  syncScore: number;
  totalXP: number;
  streak: number;
  avatarUrl?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
}

/**
 * Redesign Nine Pro v2 (21/09): card de identidade simplificado — 1 barra de
 * XP só como decisão principal; Sync e Streak viram texto de apoio numa
 * linha, não 3 caixas de "Stat" competindo em peso visual com o nível.
 * "Completar perfil" já vem embutido no próprio card (dashed button) quando
 * faltam dados físicos — não é um botão solto em outro lugar da tela.
 * Paleta contida a preto/laranja (holográfico do fundo trocado de
 * laranja+roxo pra laranja+âmbar).
 */
export function DigitalIDCard({ name, level, classTier = 'Diamante', syncScore, totalXP, streak, avatarUrl, age, heightCm, weightKg }: Props) {
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const levelProgress = (totalXP % 1000) / 10;
  const [showShare, setShowShare] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const hasBioData = Boolean(age || heightCm || weightKg);

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-card shadow-elevated">
        {/* Holográfico — laranja + âmbar, sem roxo */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 20% 0%, hsl(var(--primary) / 0.35), transparent 55%), radial-gradient(circle at 100% 100%, hsl(30 95% 52% / 0.20), transparent 60%)',
          }}
        />
        <div className="relative p-6 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-data tracking-[0.3em] text-muted-foreground">9FIT · ID CARD</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAdjusting(true)}
                aria-label="Ajustar dados do perfil"
                className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowShare(true)}
                aria-label="Compartilhar ID Card"
                className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <Shield className="w-4 h-4 text-primary" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-elevated border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-2xl text-foreground">{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-xl truncate">{name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary">
                  LVL {level}
                </span>
                <span className="text-[10px] tracking-widest uppercase text-muted-foreground">· {classTier}</span>
              </div>
            </div>
          </div>

          {/* Dados físicos (da etapa 1 do Completar Perfil) — ou CTA embutido pra completar */}
          {hasBioData ? (
            <div className="grid grid-cols-3 gap-2">
              <BioChip label="Idade" value={age ? `${age}a` : '—'} />
              <BioChip label="Altura" value={heightCm ? `${heightCm}cm` : '—'} />
              <BioChip label="Peso" value={weightKg ? `${weightKg}kg` : '—'} />
            </div>
          ) : (
            <button
              onClick={() => setAdjusting(true)}
              className="w-full rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] py-2.5 text-[11px] text-primary font-semibold"
            >
              Completar perfil (idade/altura/peso)
            </button>
          )}

          {/* XP bar — única barra, decisão principal do card */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] tracking-widest uppercase text-muted-foreground">XP NEXT LEVEL</span>
              <span className="text-[10px] font-data text-foreground">{totalXP.toLocaleString('pt-BR')} XP</span>
            </div>
            <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${levelProgress}%`, background: 'hsl(var(--primary))' }}
              />
            </div>
          </div>

          {/* Sync/Streak — texto de apoio, não competem com a barra de XP */}
          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Sync <span className="text-foreground font-semibold">{syncScore}%</span>
            <span className="mx-2 text-white/15">·</span>
            Streak <span className="text-foreground font-semibold">{streak}d</span>
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showShare && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowShare(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-primary/30 bg-background p-5 pb-8 sm:pb-5"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-display text-lg">Compartilhar ID Card</p>
                <button onClick={() => setShowShare(false)} className="w-7 h-7 rounded-lg border border-white/10 grid place-items-center">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ShareableCard
                contentType="id_card_upgrade"
                title={name}
                subtitle={`LVL ${level} · ${classTier}`}
                stat={{ label: 'SYNC SCORE', value: `${syncScore}%` }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ajustar dados: reabre só a etapa 1 do wizard, fecha ao salvar, sem repassar pelas etapas de ativação */}
      <CompleteProfileFlow open={adjusting} onClose={() => setAdjusting(false)} editOnly />
    </>
  );
}

function BioChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] py-2 text-center">
      <p className="text-[8px] tracking-widest uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-display text-foreground">{value}</p>
    </div>
  );
}
