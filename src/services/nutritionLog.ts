import { supabase } from "@/integrations/supabase/client";
import { businessDate } from '@/services/dailyContextRules';

export async function saveNutritionLog(meal: { athlete_id: string; meal_name: string; calories: number; protein: number; carbs: number; fat: number; date?: string }) {
  if (!meal.athlete_id || !meal.meal_name.trim() || [meal.calories, meal.protein, meal.carbs, meal.fat].some(v => !Number.isFinite(v) || v < 0)) throw new Error("Revise o nome e os valores da refeição.");
  const { data, error } = await supabase.from("nutrition_logs").insert({ ...meal, date: meal.date || businessDate() }).select().single();
  if (error) throw error;
  window.dispatchEvent(new CustomEvent("9fit:nutrition-updated", { detail: data }));
  // The diary is durable before optional score synchronization begins.
  void supabase.functions.invoke("progress-sync", { body: { kind: "nutrition_log", payload: { ...meal, nutrition_log_id: data.id } } }).then(({ error, data: sync }) => {
    if (error || sync?.success === false) console.warn("Nutrition score synchronization pending", error || sync.error);
    window.dispatchEvent(new Event("9fit:sync_updated"));
  }).catch(error => console.warn("Nutrition score synchronization pending", error));
  return data;
}
