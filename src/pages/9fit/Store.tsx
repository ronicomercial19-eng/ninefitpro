import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { logPredictiveEvent } from "@/services/predictiveEngine";
import { toast } from "sonner";

const CATALOG = [
  { id: "elastico-pro", name: "Elástico Resistance Pro", price: 89, category: "Acessórios", img: "🟧" },
  { id: "luva-elite", name: "Luva Elite Training", price: 129, category: "Acessórios", img: "🥊" },
  { id: "creatina", name: "Creatina Monohidratada 300g", price: 149, category: "Suplemento", img: "💊" },
  { id: "whey", name: "Whey Isolado 900g", price: 219, category: "Suplemento", img: "🥤" },
  { id: "bottle", name: "Squeeze 1L Vanguarda", price: 59, category: "Equipamento", img: "🧴" },
  { id: "camiseta", name: "Camiseta Dry Elite", price: 99, category: "Vestuário", img: "👕" },
];

export default function NineFitStore() {
  const { user } = useAuth();
  const [items, setItems] = useState<{ external_id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from("library_items" as any).select("external_id, name, type").eq("type", "products").limit(20)
      .then(({ data }) => setItems((data as any) || []));
  }, []);

  const buy = async (name: string) => {
    if (!user?.id) {
      toast.error("Faça login para comprar");
      return;
    }
    await logPredictiveEvent(user.id, "purchase", { item: name, store: "9store" }, "9store");
    toast.success(`${name} adicionado ao carrinho`);
  };

  const merged = [
    ...CATALOG,
    ...items.map((i) => ({ id: i.external_id, name: i.name, price: 99, category: "Loja", img: "📦" })),
  ];

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // 9STORE</p>
        <h1 className="text-massive text-4xl text-foreground mt-1">STORE NATIVA</h1>
        <p className="text-xs font-data text-muted-foreground uppercase tracking-widest mt-1">
          E-commerce integrado ao Banco Supremo
        </p>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {merged.map((p, i) => (
          <motion.div
            key={p.id + i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass-mission rounded-xl p-3 flex flex-col"
          >
            <div className="aspect-square rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-4xl mb-2">
              {p.img}
            </div>
            <p className="text-[9px] font-data tracking-widest text-muted-foreground uppercase">{p.category}</p>
            <p className="text-sm text-foreground line-clamp-2 mt-0.5">{p.name}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-editorial text-base text-primary">R$ {p.price}</span>
              <button
                onClick={() => buy(p.name)}
                className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                aria-label="Comprar"
              >
                <ShoppingBag className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <BottomNavigation />
    </div>
  );
}
