import React, { useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Target, TrendingUp, LineChart } from 'lucide-react';

export interface PeriodizationModelPreview {
  id: string;
  title: string;
  goal?: string;
  duration?: string;
  description?: string;
  recommended_for?: string[] | null;
  macrocycle?: any[] | null;
  detailed_mesocycles?: any[] | null;
}

interface Props {
  model: PeriodizationModelPreview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado só depois que o professor confirma "De acordo, atribuir" */
  onConfirm: (model: PeriodizationModelPreview) => void;
  confirming?: boolean;
}

const getDurationLabel = (duration?: string) => {
  switch (duration) {
    case '3m': return '3 meses';
    case '6m': return '6 meses';
    case '12m': return '12 meses';
    case '18m': return '18 meses';
    case '24m': return '24 meses';
    default: return duration || '—';
  }
};

function computeFallbackRpeWave(numMacrocycles: number): { rpe: number; isDeload: boolean }[] {
  const points: { rpe: number; isDeload: boolean }[] = [];
  for (let i = 1; i <= numMacrocycles; i++) {
    const base = Math.min(5 + i, 9);
    for (let j = 1; j <= 4; j++) {
      const isDeload = j === 4;
      const rpe = isDeload ? Math.max(base - 3, 5) : Math.min(base + j - 1, 9);
      points.push({ rpe, isDeload });
    }
  }
  return points;
}

function parseRpe(v: any): number | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const match = s.match(/([0-9]+(\.[0-9]+)?)(?!.*[0-9])/);
  return match ? parseFloat(match[1]) : null;
}

function MiniRpeWave({ points }: { points: { rpe: number; isDeload: boolean }[] }) {
  if (points.length < 2) {
    return <p className="text-sm text-muted-foreground">Dados insuficientes para traçar a onda de RPE.</p>;
  }
  const width = 560, height = 160, pad = 16;
  const w = width - pad * 2, h = height - pad * 2;
  const toXY = (i: number, rpe: number) => {
    const x = pad + (i / (points.length - 1)) * w;
    const y = pad + h - (Math.min(Math.max(rpe, 0), 10) / 10) * h;
    return [x, y] as const;
  };
  const polyline = points.map((p, i) => toXY(i, p.rpe).join(',')).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <polyline points={polyline} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => {
        const [x, y] = toXY(i, p.rpe);
        return <circle key={i} cx={x} cy={y} r={p.isDeload ? 4 : 2.5} fill={p.isDeload ? 'hsl(45, 90%, 55%)' : 'hsl(var(--primary))'} />;
      })}
    </svg>
  );
}

/**
 * Splash de visualização macro, mostrado ANTES de materializar a periodização
 * pra valer (via fn_generate_plan_from_bank_model). Puramente de leitura —
 * não grava nada. O botão "Confirmar" devolve controle pro fluxo existente.
 */
export default function PeriodizationPreviewDialog({ model, open, onOpenChange, onConfirm, confirming }: Props) {
  const hasStructured = !!(model?.detailed_mesocycles && model.detailed_mesocycles.length > 0);

  const rpeWave = useMemo(() => {
    if (!model) return [];
    if (hasStructured) {
      return [...model.detailed_mesocycles!]
        .sort((a, b) => (Number(a.mes) || 0) - (Number(b.mes) || 0))
        .map((m) => ({
          rpe: parseRpe(m.rpe_alvo) ?? 6,
          isDeload: String(m.semana_deload ?? '').toLowerCase() === 'true' || /deload/i.test(String(m.name || m.nome || '')),
        }));
    }
    return computeFallbackRpeWave(model.macrocycle?.length || 0);
  }, [model, hasStructured]);

  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{model.title}</DialogTitle>
          <DialogDescription>{model.description || 'Sem descrição cadastrada.'}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {model.goal && <Badge variant="secondary"><Target className="h-3.5 w-3.5 mr-1" /> {model.goal}</Badge>}
          <Badge variant="secondary"><Calendar className="h-3.5 w-3.5 mr-1" /> {getDurationLabel(model.duration)}</Badge>
          <Badge variant="outline">{model.macrocycle?.length || 0} macrociclos</Badge>
          <Badge variant="outline">{hasStructured ? 'Prescrição real do catálogo' : 'Prescrição sintetizada (modelo sem detalhe cadastrado)'}</Badge>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <LineChart className="h-4 w-4 text-primary" /> Onda de RPE
          </div>
          <MiniRpeWave points={rpeWave} />
          <p className="text-[11px] text-muted-foreground">
            Pontos em amarelo indicam semanas de deload (redução proposital de intensidade/volume).
          </p>
        </div>

        {hasStructured && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium">Detalhe por mesociclo</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {[...model.detailed_mesocycles!]
                .sort((a, b) => (Number(a.mes) || 0) - (Number(b.mes) || 0))
                .slice(0, 12)
                .map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/40">
                    <span className="font-medium">{m.nome || m.name || `Mesociclo ${i + 1}`}</span>
                    <span className="text-muted-foreground">
                      RPE {m.rpe_alvo || '—'} · {m.faixa_reps || '—'} reps · {m.intensidade_percent_1rm ? `${m.intensidade_percent_1rm}% 1RM` : '—'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {model.recommended_for && model.recommended_for.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Indicado para:</span>
            {model.recommended_for.map((lvl, i) => (
              <Badge key={i} variant="outline" className="text-xs">{lvl}</Badge>
            ))}
          </div>
        )}

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(model)} disabled={confirming}>
            {confirming ? 'Atribuindo…' : 'De acordo, atribuir ao aluno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
