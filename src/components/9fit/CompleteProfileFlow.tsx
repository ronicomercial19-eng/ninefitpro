import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Dumbbell, Share2, MessageCircle, Trophy, Check, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Wizard pós-onboarding "Completar Perfil" — 5 etapas sequenciais:
 *  1) Dados + foto
 *  2) Plano gerado pelo sistema (treino diário do objetivo)
 *  3) Incentivo ao primeiro treino + compartilhar
 *  4) Oferta consultoria (somente após 3 dias consecutivos)
 *  5) Recompensa 7 dias (PrimePass 1 mês + ID Card Gold)
 */
interface Props { open: boolean; onClose: () => void; }

export function CompleteProfileFlow({ open, onClose }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<any>({ full_name: "", height_cm: "", weight_kg: "", age: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [workoutsDone, setWorkoutsDone] = useState(0);
  const [saving, setSaving] = useState(false);
  const [athleteId, setAthleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    (async () => {
      const { data: ath } = await supabase.from("athletes").select("*").eq("user_id", user.id).maybeSingle();
      if (ath) {
        setAthleteId((ath as any).id);
        setProfile({
          full_name: (ath as any).full_name || "",
          height_cm: (ath as any).height_cm || "",
          weight_kg: (ath as any).weight_kg || "",
          age: (ath as any).age || "",
        });
      }
      // Streak: dias consecutivos com check-in
      const { data: ck } = await (supabase as any)
        .from("ninefit_checkins")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
        .order("created_at", { ascending: false });
      const days = new Set(((ck as any[]) || []).map((r) => new Date(r.created_at).toDateString()));
      let streak = 0;
      for (let i = 0; i < 14; i++) {
        const d = new Date(Date.now() - i * 86400000).toDateString();
        if (days.has(d)) streak++; else break;
      }
      setStreakDays(streak);
      // Workouts realizados
      const { count } = await supabase
        .from("workout_executions" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setWorkoutsDone(count || 0);
    })();
  }, [open, user?.id]);

  if (!open) return null;

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const saveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        const path = `${user.id}/avatar-${Date.now()}.${photoFile.name.split(".").pop()}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, photoFile, { upsert: true });
        if (!upErr) photoUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }
      await supabase.from("athletes").update({
        full_name: profile.full_name,
        height_cm: profile.height_cm ? Number(profile.height_cm) : null,
        weight_kg: profile.weight_kg ? Number(profile.weight_kg) : null,
        age: profile.age ? Number(profile.age) : null,
        ...(photoUrl ? { avatar_url: photoUrl } : {}),
      }).eq("user_id", user.id);

      // Resolver athlete_id via athlete_auth_link
      let resolvedAthleteId = athleteId;
      if (!resolvedAthleteId) {
        const { data: link } = await (supabase as any)
          .from("athlete_auth_link").select("athlete_id").eq("user_id", user.id).maybeSingle();
        resolvedAthleteId = (link as any)?.athlete_id ?? null;
      }
      if (resolvedAthleteId) {
        await supabase.from("athlete_profile_snapshots" as any).insert({
          athlete_id: resolvedAthleteId,
          source: "profile_complete",
          snapshot_data: { ...profile, photo: photoUrl, at: new Date().toISOString() },
        } as any);
      }
      toast.success("Perfil salvo");
      next();
    } catch {
      toast.error("Erro ao salvar perfil");
    } finally { setSaving(false); }
  };

  const claimReward = async () => {
    if (!athleteId) return;
    try {
      await supabase.rpc("fn_award_xp" as any, {
        p_athlete_id: athleteId, p_amount: 500, p_source: "complete_profile_7d",
        p_metadata: { reward: "primepass_1m+gold" },
      });
      await supabase.from("user_achievements" as any).insert({
        user_id: user?.id, achievement_type: "consistency_7d",
        title: "7 dias de consistência", description: "PrimePass 1 mês + ID Card Gold",
      });
      toast.success("🏆 Recompensa desbloqueada: PrimePass 1 mês + ID Card Gold");
      onClose();
    } catch { toast.error("Erro ao resgatar recompensa"); }
  };

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="w-full max-w-md rounded-3xl border border-primary/40 bg-card p-5 max-h-[90vh] overflow-y-auto"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Completar Perfil</p>
              <p className="text-xs text-muted-foreground">Etapa {step + 1} de 5</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg border border-white/10 grid place-items-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="h-1 rounded-full bg-white/5 mb-5 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / 5) * 100}%` }} />
          </div>

          {step === 0 && (
            <div className="space-y-3">
              <p className="font-display text-lg flex items-center gap-2"><Camera className="w-5 h-5 text-primary" /> Dados + foto</p>
              <input className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm"
                placeholder="Nome completo" value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <input className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm" placeholder="Idade" type="number"
                  value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value })} />
                <input className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm" placeholder="Altura(cm)" type="number"
                  value={profile.height_cm} onChange={(e) => setProfile({ ...profile, height_cm: e.target.value })} />
                <input className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm" placeholder="Peso(kg)" type="number"
                  value={profile.weight_kg} onChange={(e) => setProfile({ ...profile, weight_kg: e.target.value })} />
              </div>
              <label className="block rounded-xl border border-dashed border-primary/40 bg-primary/[0.04] p-4 text-center cursor-pointer">
                <Camera className="w-5 h-5 mx-auto text-primary mb-1" />
                <span className="text-xs text-muted-foreground">{photoFile?.name || "Adicionar foto"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
              </label>
              <button onClick={saveProfile} disabled={saving}
                className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3 disabled:opacity-60">
                {saving ? "Salvando..." : "Salvar e continuar"}
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="font-display text-lg flex items-center gap-2"><Dumbbell className="w-5 h-5 text-primary" /> Seu plano está pronto</p>
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
                <p className="text-xs text-muted-foreground">Treino diário gerado pelo SmartTreino</p>
                <p className="font-display text-lg mt-1">Plano personalizado</p>
              </div>
              <button onClick={() => { navigate("/9fit/train"); onClose(); }}
                className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3">Ver plano</button>
              <button onClick={next} className="w-full text-xs text-muted-foreground py-2">Pular →</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="font-display text-lg flex items-center gap-2"><Share2 className="w-5 h-5 text-primary" /> Primeiro treino</p>
              <p className="text-sm text-muted-foreground">Registrar e compartilhar seu primeiro treino acelera resultados em 3x.</p>
              <button onClick={() => { navigate("/9fit/train"); onClose(); }}
                className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3">Registrar agora</button>
              <button onClick={next} className="w-full text-xs text-muted-foreground py-2">Já fiz, próxima →</button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="font-display text-lg flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary" /> Consultoria</p>
              {streakDays >= 3 && workoutsDone >= 3 ? (
                <>
                  <p className="text-sm text-muted-foreground">{streakDays} dias consecutivos · {workoutsDone} treinos. Você liberou consultoria.</p>
                  <button onClick={() => { navigate("/9fit/staff"); onClose(); }}
                    className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3">Agendar consultoria</button>
                </>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
                  <p className="text-xs text-muted-foreground">Disponível após</p>
                  <p className="font-display text-2xl text-primary">{Math.max(0, 3 - streakDays)} dia(s) e {Math.max(0, 3 - workoutsDone)} treino(s)</p>
                  <p className="text-[11px] text-muted-foreground mt-1">de consistência consecutiva</p>
                </div>
              )}
              <button onClick={next} className="w-full text-xs text-muted-foreground py-2">Próxima →</button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="font-display text-lg flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Recompensa 7 dias</p>
              {streakDays >= 7 ? (
                <>
                  <div className="rounded-2xl border border-primary/40 bg-primary/[0.06] p-4 space-y-2">
                    <p className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary" /> PrimePass · 1 mês grátis</p>
                    <p className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary" /> Upgrade ID Card → Gold</p>
                  </div>
                  <button onClick={claimReward} className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3">Resgatar recompensa</button>
                </>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
                  <p className="text-xs text-muted-foreground">Faltam</p>
                  <p className="font-display text-3xl text-primary">{7 - streakDays} dia(s)</p>
                  <p className="text-[11px] text-muted-foreground mt-1">para PrimePass 1 mês + ID Card Gold</p>
                </div>
              )}
              <button onClick={onClose} className="w-full rounded-full border border-white/15 py-3 text-sm">Fechar</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
