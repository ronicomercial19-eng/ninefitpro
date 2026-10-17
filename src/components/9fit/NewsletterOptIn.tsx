import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { toast } from "sonner";

// Opt-in de newsletter: aparece só DEPOIS do primeiro valor entregue (1ª refeição ou 1º treino registrado).
// Consentimento explícito (LGPD): checkbox desmarcado, texto de finalidade e registro de data/hora.
const CONSENT_TEXT = "Quero receber e-mails do 9FIT com dicas de treino, nutrição e novidades. Posso cancelar quando quiser.";
const DISMISS_KEY = "9fit_newsletter_dismissed";

export function NewsletterOptIn() {
  const { user } = useAuth();
  const { athleteId } = useAthleteId();
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id || !user.email || !athleteId) { setVisible(false); return; }
    if (localStorage.getItem(`${DISMISS_KEY}:${user.id}`)) { setVisible(false); return; }
    let active = true;
    async function check() {
      const db = supabase as any;
      const [optin, meals, workouts] = await Promise.all([
        db.from("newsletter_optins").select("id").eq("user_id", user!.id).maybeSingle(),
        supabase.from("nutrition_logs").select("id", { count: "exact", head: true }).eq("athlete_id", athleteId!),
        supabase.from("workout_executions").select("id", { count: "exact", head: true }).eq("athlete_id", athleteId!).eq("status", "completed"),
      ]);
      if (!active || optin.error) return;
      const alreadyOptedIn = !!optin.data;
      const hadFirstValue = (meals.count ?? 0) > 0 || (workouts.count ?? 0) > 0;
      setVisible(!alreadyOptedIn && hadFirstValue);
    }
    void check();
    return () => { active = false; };
  }, [user?.id, user?.email, athleteId]);

  if (!visible || !user?.email) return null;

  async function accept() {
    if (!checked || saving || !user?.email) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("newsletter_optins").insert({
        user_id: user.id,
        athlete_id: athleteId,
        email: user.email,
        source: "hub",
        consent_text: CONSENT_TEXT,
      });
      if (error && error.code !== "23505") throw error;
      toast.success("Inscrição confirmada");
      setVisible(false);
    } catch {
      toast.error("Não foi possível salvar sua inscrição.");
    } finally {
      setSaving(false);
    }
  }

  function dismiss() {
    if (user?.id) localStorage.setItem(`${DISMISS_KEY}:${user.id}`, String(Date.now()));
    setVisible(false);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-black/60 p-4 space-y-3" aria-label="Newsletter 9FIT">
      <p className="font-data text-[9px] uppercase tracking-[0.3em] text-primary/80">Newsletter 9FIT</p>
      <p className="text-sm text-foreground">Receba dicas e novidades no seu e-mail.</p>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{CONSENT_TEXT}</span>
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!checked || saving}
          onClick={() => void accept()}
          className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 font-display text-[11px] font-black uppercase tracking-wider text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Quero receber"}
        </button>
        <button type="button" onClick={dismiss} className="text-xs text-muted-foreground">Agora não</button>
      </div>
    </section>
  );
}
