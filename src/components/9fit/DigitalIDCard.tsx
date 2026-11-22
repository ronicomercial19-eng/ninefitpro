import { lazy, Suspense, useState } from "react";
import { Share2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
const ShareableCard = lazy(() =>
  import("./ShareableCard").then((m) => ({ default: m.ShareableCard }))
);
const CompleteProfileFlow = lazy(() =>
  import("./CompleteProfileFlow").then((m) => ({
    default: m.CompleteProfileFlow,
  }))
);
interface Props {
  name: string;
  level: number;
  classTier?: string;
  syncScore: number | null;
  totalXP: number;
  streak: number;
  avatarUrl?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  statsKnown?: boolean;
  bioRead?: "loading" | "unavailable" | "ready";
  weightRead?: "loading" | "unavailable" | "ready";
}
export function DigitalIDCard({
  name,
  level,
  classTier,
  syncScore,
  totalXP,
  streak,
  avatarUrl,
  age,
  heightCm,
  weightKg,
  statsKnown = true,
  bioRead = "ready",
  weightRead = "ready",
}: Props) {
  const [share, setShare] = useState(false),
    [adjusting, setAdjusting] = useState(false),
    [completing, setCompleting] = useState(false);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const hasBioData = Boolean(age || heightCm || weightKg);
  const progress = Math.max(0, Math.min(100, (totalXP % 1000) / 10));
  return (
    <>
      <section
        aria-label="Sua identidade no 9FIT"
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-[radial-gradient(ellipse_at_top_right,rgba(239,122,69,0.13),#111416_65%)] p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            9FIT / Sua identidade
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdjusting(true)}
              aria-label="Ajustar dados do perfil"
              className="grid size-11 place-items-center rounded-xl border border-white/15 text-muted-foreground hover:text-primary"
            >
              <Pencil size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setShare(true)}
              aria-label="Compartilhar ID Card"
              className="grid size-11 place-items-center rounded-xl border border-white/15 text-muted-foreground hover:text-primary"
            >
              <Share2 size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white/5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-semibold text-primary">
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">
              {name}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Seus dados, suas preferências e o contexto do seu plano.
            </p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2">
          {[
            {
              label: "Idade",
              value:
                bioRead === "loading"
                  ? "Consultando…"
                  : bioRead === "unavailable"
                  ? "Não confirmado"
                  : age
                  ? `${age} anos`
                  : "Não informada",
            },
            {
              label: "Altura",
              value:
                bioRead === "loading"
                  ? "Consultando…"
                  : bioRead === "unavailable"
                  ? "Não confirmado"
                  : heightCm
                  ? `${heightCm} cm`
                  : "Não informada",
            },
            {
              label: "Peso",
              value:
                weightRead === "loading"
                  ? "Consultando…"
                  : weightRead === "unavailable"
                  ? "Não confirmado"
                  : weightKg
                  ? `${weightKg} kg`
                  : "Não informado",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-2 py-3 text-center"
            >
              <dt className="text-[10px] text-muted-foreground">
                {item.label}
              </dt>
              <dd className="mt-1 break-words text-xs font-semibold sm:text-sm">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={() =>
            hasBioData ? setAdjusting(true) : setCompleting(true)
          }
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
        >
          <Pencil size={15} aria-hidden="true" />
          {hasBioData ? "Atualizar meus dados" : "Adicionar meus dados"}
        </button>
        <details className="mt-3 border-t border-white/10 pt-3">
          <summary className="min-h-11 cursor-pointer text-xs text-muted-foreground">
            Pontos e participação no app
          </summary>
          {statsKnown ? (
            <div className="space-y-3">
              <div className="flex flex-wrap justify-between gap-2 text-xs">
                <span>
                  Nível {level}
                  {classTier ? ` · ${classTier}` : ""}
                </span>
                <span>{totalXP.toLocaleString("pt-BR")} XP</span>
              </div>
              <div
                role="progressbar"
                aria-label="Pontos dentro do nível de mil XP"
                aria-valuemin={0}
                aria-valuemax={1000}
                aria-valuenow={totalXP % 1000}
                className="h-1.5 overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Sequência registrada: {streak} dias. Pontos representam
                participação no app.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Pontos e nível não confirmados nesta leitura.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            SYNC:{" "}
            {syncScore == null ? "sem leitura confirmada" : `${syncScore}/100`}.
            Consulte o Hub para entender o resumo do dia.
          </p>
        </details>
      </section>
      <Dialog open={share} onOpenChange={setShare}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Compartilhar seu card</DialogTitle>
            <DialogDescription>
              Confira os dados antes de compartilhar sua identidade do 9FIT.
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<p role="status">Preparando seu card…</p>}>
            <ShareableCard
              contentType="id_card_upgrade"
              title={name}
              subtitle={statsKnown ? `NÍVEL ${level}` : "9FIT"}
              stat={{
                label: "SYNC / ROTINA",
                value: syncScore == null ? "Sem leitura" : `${syncScore}/100`,
              }}
            />
          </Suspense>
        </DialogContent>
      </Dialog>
      {adjusting && (
        <Suspense fallback={<p role="status">Abrindo edição…</p>}>
          <CompleteProfileFlow
            open
            onClose={() => setAdjusting(false)}
            editOnly
          />
        </Suspense>
      )}
      {completing && (
        <Suspense fallback={<p role="status">Abrindo seu perfil…</p>}>
          <CompleteProfileFlow open onClose={() => setCompleting(false)} />
        </Suspense>
      )}
    </>
  );
}
