import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Utensils } from "lucide-react";

interface NutritionLogFormProps {
  open: boolean;
  onClose: () => void;
  athleteId: string;
  onSaved: () => void;
}

const QUICK_MEALS = [
  { name: "Café da Manhã", calories: 350, protein: 20, carbs: 45, fat: 12 },
  { name: "Almoço", calories: 600, protein: 40, carbs: 70, fat: 20 },
  { name: "Lanche", calories: 200, protein: 15, carbs: 25, fat: 8 },
  { name: "Jantar", calories: 500, protein: 35, carbs: 55, fat: 18 },
];

export function NutritionLogForm({ open, onClose, athleteId, onSaved }: NutritionLogFormProps) {
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleQuickFill = (meal: typeof QUICK_MEALS[0]) => {
    setMealName(meal.name);
    setCalories(meal.calories);
    setProtein(meal.protein);
    setCarbs(meal.carbs);
    setFat(meal.fat);
  };

  const handleSave = async () => {
    if (!mealName.trim()) {
      toast.error("Informe o nome da refeição");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("nutrition_logs").insert({
        athlete_id: athleteId,
        meal_name: mealName.trim(),
        calories,
        protein,
        carbs,
        fat,
        date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;
      toast.success("Refeição registrada! 🥗");
      onSaved();
      onClose();
      // Reset
      setMealName("");
      setCalories(0);
      setProtein(0);
      setCarbs(0);
      setFat(0);
    } catch {
      toast.error("Erro ao registrar refeição");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border rounded-sm max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Utensils className="w-5 h-5 text-primary" />
            Registrar Refeição
          </DialogTitle>
        </DialogHeader>

        {/* Quick meals */}
        <div className="flex flex-wrap gap-2">
          {QUICK_MEALS.map((meal) => (
            <button
              key={meal.name}
              onClick={() => handleQuickFill(meal)}
              className="text-[10px] px-3 py-1.5 bg-card border border-border rounded-full hover:border-primary/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              {meal.name}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider">Nome da Refeição</Label>
            <Input value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="Ex: Almoço" className="bg-card border-border mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider">Calorias (kcal)</Label>
              <Input type="number" value={calories} onChange={(e) => setCalories(Number(e.target.value))} className="bg-card border-border mt-1" min={0} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Proteína (g)</Label>
              <Input type="number" value={protein} onChange={(e) => setProtein(Number(e.target.value))} className="bg-card border-border mt-1" min={0} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Carboidrato (g)</Label>
              <Input type="number" value={carbs} onChange={(e) => setCarbs(Number(e.target.value))} className="bg-card border-border mt-1" min={0} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Gordura (g)</Label>
              <Input type="number" value={fat} onChange={(e) => setFat(Number(e.target.value))} className="bg-card border-border mt-1" min={0} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground font-bold">
            {saving ? "Salvando..." : "Registrar Refeição"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
