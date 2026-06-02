import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Lock, Activity } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STEPS = [
  { n: 1, label: "CONEXÃO" },
  { n: 2, label: "PERFIL" },
  { n: 3, label: "PROTOCOLO" },
  { n: 4, label: "PRIME" },
];

const PROTOCOLS = [
  { key: "neurogenesis", title: "NEUROGÊNESIS", desc: "Foco cognitivo + recuperação neural" },
  { key: "metabolic_alpha", title: "METABÓLICO ALPHA", desc: "Queima otimizada + força mitocondrial" },
  { key: "recovery_total", title: "RECUPERAÇÃO TOTAL", desc: "Sono profundo + redução inflamação" },
];

export default function NineFitAtivacao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stepIdx, setStepIdx] = useState(2); // matches mock "Protocolo 2/4"
  const [protocol, setProtocol] = useState("neurogenesis");
  const [activating, setActivating] = useState(false);

  const onActivate = async () => {
    setActivating(true);
    try {
      if (user) {
        await supabase.from("user_preferences" as any).upsert({
          user_id: user.id,
          preferred_protocol: protocol,
          activated_at: new Date().toISOString(),
        });
      }
      toast.success("Ativação iniciada");
      setStepIdx(3);
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      {/* Hero */}
      <div className="px-6 pt-10 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-primary font-bold">Welcome Activation</p>
        <h1 className="mt-4 font-display text-4xl leading-tight">
          BEM-VINDO À<br /><span className="text-primary">9FIT PRO</span> <span className="text-primary">✣</span>
        </h1>
      </div>

      {/* Iniciar */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="mx-6 mt-8 rounded-3xl border border-primary/50 p-6 text-center bg-black/60"
        style={{ boxShadow: "0 0 60px -20px hsl(var(--primary)/0.7)" }}
      >
        <p className="text-base">Ative seu protocolo de<br/>elite em 90 segundos</p>
        <button
          onClick={onActivate}
          disabled={activating}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-bold px-8 py-3 shadow-[0_0_30px_hsl(var(--primary)/0.6)]"
        >
          INICIAR ATIVAÇÃO <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Stepper */}
      <div className="mx-6 mt-10 rounded-3xl border border-primary/30 bg-black/60 p-6">
        <p className="text-center text-xs text-muted-foreground">Step-by-step guided setup</p>
        <div className="mt-4 flex items-center justify-between">
          {STEPS.map((s, i) => {
            const done = i < stepIdx;
            const cur = i === stepIdx;
            return (
              <div key={s.n} className="flex flex-col items-center flex-1">
                <div className={`w-9 h-9 rounded-md flex items-center justify-center font-bold border ${
                  done || cur ? "bg-primary text-primary-foreground border-primary shadow-[0_0_18px_hsl(var(--primary)/0.6)]" : "bg-white/[0.04] border-white/10 text-muted-foreground"
                }`}>{s.n}</div>
                <p className={`text-[9px] uppercase tracking-widest mt-2 ${done || cur ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                {cur && <p className="text-[9px] text-primary mt-0.5">{stepIdx}/{STEPS.length}</p>}
              </div>
            );
          })}
        </div>

        <h2 className="mt-6 text-center font-display text-2xl tracking-tight">
          CONFIGURANDO<br />SEU SISTEMA
        </h2>
        <p className="text-center text-xs text-muted-foreground mt-2">Sincronizando com seu relógio…</p>

        <div className="mt-5 flex items-center gap-4">
          <ul className="space-y-2.5 text-sm flex-1">
            {["Sensor Neural conectado", "Dados de sono importados", "Frequência cardíaca calibrada"].map((t, i) => (
              <li key={t} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md border border-primary/60 bg-primary/15 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </span>
                {t}
              </li>
            ))}
          </ul>
          {/* Waveform */}
          <svg viewBox="0 0 80 40" className="w-24 h-12">
            <polyline
              points="0,20 10,20 14,8 18,32 22,20 30,20 34,4 38,36 42,20 60,20 64,12 68,28 72,20 80,20"
              fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"
              style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)))" }}
            />
          </svg>
        </div>
      </div>

      {/* Protocolo */}
      <div className="mx-6 mt-6 rounded-3xl border border-primary/30 bg-black/60 p-6">
        <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest">Biohacker protocol selection</p>
        <h3 className="text-center text-primary font-bold text-lg mt-1">ESCOLHA SEU PROTOCOLO</h3>
        <div className="mt-4 space-y-2.5">
          {PROTOCOLS.map((p) => {
            const sel = protocol === p.key;
            return (
              <button key={p.key} onClick={() => setProtocol(p.key)}
                className={`w-full rounded-2xl border p-3 text-left flex items-center justify-between transition ${
                  sel ? "border-primary bg-primary/[0.08] shadow-[0_0_20px_-8px_hsl(var(--primary)/0.7)]" : "border-white/10 bg-white/[0.02]"
                }`}>
                <div>
                  <p className="font-semibold text-sm">{p.title}</p>
                  <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                </div>
                {p.key === "neurogenesis" && <span className="text-primary">✣</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prime */}
      <div className="mx-6 mt-6 rounded-3xl border border-primary/50 bg-black/70 p-6 text-center"
        style={{ boxShadow: "0 0 50px -20px hsl(var(--primary)/0.6)" }}>
        <p className="text-xs text-primary tracking-[0.3em] uppercase font-bold">Prime Activation</p>
        <h3 className="mt-2 font-display text-3xl">9FIT <span className="text-primary">PRIME</span></h3>
        <p className="mt-3 text-sm text-muted-foreground">Desbloqueie acesso total ao protocolo<br />personalizado por 12 meses</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <span className="text-muted-foreground line-through text-sm">R$ 89/mês</span>
          <span className="font-display text-xl text-primary">R$ 49<span className="text-xs">/mês</span></span>
        </div>
        <p className="text-[10px] text-muted-foreground">(ativação única)</p>
        <button onClick={() => navigate("/9fit/checkout/prime")}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-bold px-6 py-3 shadow-[0_0_30px_hsl(var(--primary)/0.6)]">
          <Lock className="w-4 h-4" /> ATIVAR 9FIT PRIME AGORA
        </button>
        <p className="text-[10px] text-muted-foreground underline mt-2">Garantia de 30 dias</p>
      </div>

      <BottomNavigation />
    </div>
  );
}
