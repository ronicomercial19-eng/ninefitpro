import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, CheckCircle2, ChevronRight, Calendar as CalIcon, UtensilsCrossed } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAthleteId } from "@/hooks/useAthleteId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tab = "diet" | "market";
type Meal = { id: string; meal_name: string; calories: number; protein: number; carbs: number; fat: number; created_at: string };
type Product = { id: string; name: string; description: string | null; price: number | null; image_url: string | null };

const KCAL_GOAL = 2100;
const P_GOAL = 140;
const C_GOAL = 210;
const F_GOAL = 65;

export default function NineFitFoods() {
  const { athleteId } = useAthleteId();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("diet");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!athleteId) return;
      const today = new Date(); today.setHours(0,0,0,0);
      const [{ data: m }, { data: p }] = await Promise.all([
        supabase.from("nutrition_logs")
          .select("id, meal_name, calories, protein, carbs, fat, created_at")
          .eq("athlete_id", athleteId)
          .gte("created_at", today.toISOString())
          .order("created_at", { ascending: true }),
        supabase.from("products")
          .select("id, name, description, price, image_url")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      setMeals((m as Meal[]) || []);
      setProducts((p as Product[]) || []);
      setLoading(false);
    })();
  }, [athleteId]);

  const totals = useMemo(() => meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (m.calories || 0),
      p: acc.p + (m.protein || 0),
      c: acc.c + (m.carbs || 0),
      f: acc.f + (m.fat || 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  ), [meals]);

  const pct = (v: number, g: number) => Math.min(105, Math.round((v / g) * 100));

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <header className="px-4 pt-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">Foods</h1>
        <div className="w-9 h-9 rounded-lg grid place-items-center bg-emerald-500/15 border border-emerald-500/40">
          <Leaf className="w-4 h-4 text-emerald-400" />
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 mt-4 grid grid-cols-2 text-sm">
        {[
          { k: "diet", l: "Minha Dieta" },
          { k: "market", l: "9Foods Marketplace" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as Tab)}
            className={`pb-2 border-b-2 transition ${tab === t.k ? "border-emerald-400 text-foreground" : "border-white/10 text-muted-foreground"}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === "diet" && (
        <div className="px-4 mt-5 space-y-5">
          {/* Plano diário */}
          <section>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-2 mb-2">
              <CalIcon className="w-3.5 h-3.5" /> Plano Diário · {format(new Date(), "EEE, dd/MM", { locale: ptBR })}
            </p>
            <div className="rounded-2xl p-4 bg-emerald-950/40 border border-emerald-500/30">
              <p className="text-center font-display text-2xl">
                {totals.kcal.toLocaleString("pt-BR")}{" "}
                <span className="text-muted-foreground text-base">/ {KCAL_GOAL} kcal</span>
              </p>
              <div className="grid grid-cols-3 gap-3 mt-3 text-center">
                <MacroBar label="Proteínas" v={totals.p} g={P_GOAL} color="bg-emerald-400" suffix="g" pct={pct(totals.p, P_GOAL)} />
                <MacroBar label="Carboidratos" v={totals.c} g={C_GOAL} color="bg-red-400" suffix="g" pct={pct(totals.c, C_GOAL)} />
                <MacroBar label="Gorduras" v={totals.f} g={F_GOAL} color="bg-amber-400" suffix="g" pct={pct(totals.f, F_GOAL)} />
              </div>
            </div>
          </section>

          {/* Refeições */}
          <section>
            <p className="font-display text-lg mb-2">Refeições de Hoje</p>
            {loading ? (
              <p className="text-xs text-muted-foreground">Carregando…</p>
            ) : meals.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                Nenhuma refeição registrada hoje.
                <button onClick={() => navigate("/9fit/dieta")} className="ml-2 text-emerald-400 font-semibold">Registrar</button>
              </div>
            ) : (
              <ul className="space-y-2">
                {meals.map((m) => (
                  <li key={m.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-emerald-500/10 grid place-items-center">
                      <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{format(new Date(m.created_at), "HH:mm")}</p>
                      <p className="font-semibold truncate">{m.meal_name}</p>
                      <p className="text-[11px] text-muted-foreground">• {m.calories} kcal · {m.protein}g P</p>
                    </div>
                    <span className="text-[10px] font-semibold rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-1 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Concluído
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Marketplace preview */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="font-display text-lg">9Foods Marketplace</p>
              <button onClick={() => setTab("market")} className="text-emerald-400">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {products.slice(0, 4).map((p) => (
                <ProductCard key={p.id} p={p} onClick={() => toast.info("Marketplace em breve")} />
              ))}
              {products.length === 0 && (
                <p className="text-xs text-muted-foreground col-span-2">Marketplace em breve.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "market" && (
        <div className="px-4 mt-5">
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} onClick={() => toast.info("Checkout em breve")} />
            ))}
            {products.length === 0 && (
              <p className="text-xs text-muted-foreground col-span-2">Nenhum produto disponível.</p>
            )}
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}

function MacroBar({ label, v, g, color, suffix, pct }: { label: string; v: number; g: number; color: string; suffix: string; pct: number }) {
  return (
    <div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-data">
        {Math.round(v)}{suffix} <span className="text-emerald-400">{pct}%</span>
      </p>
    </div>
  );
}

function ProductCard({ p, onClick }: { p: Product; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] hover:border-emerald-500/40 transition"
    >
      <div className="aspect-square bg-muted">
        {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />}
      </div>
      <div className="p-2">
        <p className="text-xs font-semibold truncate">{p.name}</p>
        {p.price != null && (
          <p className="text-[11px] font-data text-emerald-400 mt-0.5">R$ {Number(p.price).toFixed(2)}</p>
        )}
      </div>
    </button>
  );
}
