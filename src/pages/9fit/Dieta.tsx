import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Utensils, 
  Plus, 
  Flame,
  Apple,
  Beef,
  Droplets,
  Loader2,
  CheckCircle
} from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NutritionPlan {
  id: string;
  calories_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  meals: Meal[];
}

interface Meal {
  id: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: string[];
  completed?: boolean;
}

// Skeleton component
function DietaSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 bg-card border border-border rounded-sm animate-shimmer" />
      <div className="h-32 bg-card border border-border rounded-sm animate-shimmer" />
      <div className="h-32 bg-card border border-border rounded-sm animate-shimmer" />
    </div>
  );
}

// Empty state component
function EmptyDieta() {
  return (
    <div className="bg-card border border-border rounded-sm p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <Utensils className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">
        Nenhuma refeição registrada hoje
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Registre suas refeições no plano alimentar e acompanhe seus macros.
      </p>
      <button className="btn-neon px-6 py-3 rounded-sm inline-flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Adicionar Refeição
      </button>
    </div>
  );
}

export default function NineFitDieta() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [consumed, setConsumed] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  // Simulated data - would come from Supabase
  useEffect(() => {
    const fetchNutritionPlan = async () => {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - in production, fetch from Supabase filtered by user
      const mockPlan: NutritionPlan = {
        id: "1",
        calories_goal: 2000,
        protein_goal: 150,
        carbs_goal: 200,
        fat_goal: 70,
        meals: [
          {
            id: "1",
            name: "Café da Manhã",
            time: "07:00",
            calories: 420,
            protein: 30,
            carbs: 45,
            fat: 15,
            foods: ["2 ovos mexidos", "1 pão integral", "1 banana"],
            completed: true
          },
          {
            id: "2",
            name: "Almoço",
            time: "12:00",
            calories: 600,
            protein: 45,
            carbs: 60,
            fat: 20,
            foods: ["150g frango grelhado", "Arroz integral", "Salada verde"],
            completed: false
          },
          {
            id: "3",
            name: "Jantar",
            time: "19:00",
            calories: 500,
            protein: 40,
            carbs: 50,
            fat: 15,
            foods: ["Peixe grelhado", "Batata doce", "Legumes"],
            completed: false
          }
        ]
      };

      setPlan(mockPlan);
      
      // Calculate consumed from completed meals
      const completedMeals = mockPlan.meals.filter(m => m.completed);
      setConsumed({
        calories: completedMeals.reduce((acc, m) => acc + m.calories, 0),
        protein: completedMeals.reduce((acc, m) => acc + m.protein, 0),
        carbs: completedMeals.reduce((acc, m) => acc + m.carbs, 0),
        fat: completedMeals.reduce((acc, m) => acc + m.fat, 0)
      });
      
      setLoading(false);
    };

    fetchNutritionPlan();
  }, [currentDate, user]);

  const toggleMealCompleted = (mealId: string) => {
    if (!plan) return;
    
    const updatedMeals = plan.meals.map(meal => {
      if (meal.id === mealId) {
        const newCompleted = !meal.completed;
        
        // Update consumed
        if (newCompleted) {
          setConsumed(prev => ({
            calories: prev.calories + meal.calories,
            protein: prev.protein + meal.protein,
            carbs: prev.carbs + meal.carbs,
            fat: prev.fat + meal.fat
          }));
        } else {
          setConsumed(prev => ({
            calories: prev.calories - meal.calories,
            protein: prev.protein - meal.protein,
            carbs: prev.carbs - meal.carbs,
            fat: prev.fat - meal.fat
          }));
        }
        
        return { ...meal, completed: newCompleted };
      }
      return meal;
    });
    
    setPlan({ ...plan, meals: updatedMeals });
    toast.success("Refeição atualizada!");
  };

  const caloriesProgress = plan ? (consumed.calories / plan.calories_goal) * 100 : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <button 
          onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() - 1)))}
          className="p-2 hover:bg-muted rounded-sm transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold text-foreground capitalize">
            {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h1>
        </div>
        <button 
          onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() + 1)))}
          className="p-2 hover:bg-muted rounded-sm transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="px-4">
          <DietaSkeleton />
        </div>
      ) : !plan || plan.meals.length === 0 ? (
        <div className="px-4">
          <EmptyDieta />
        </div>
      ) : (
        <>
          {/* Macros Summary Card */}
          <div className="px-4 mb-6">
            <div className="bg-card border border-border rounded-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Meu Plano Alimentar
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Meta</span>
                  <span className="text-xs text-primary">{plan.calories_goal} kcal</span>
                </div>
              </div>

              {/* Circular Progress */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="50"
                      stroke="hsl(var(--muted))"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="50"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${caloriesProgress * 3.14} 314`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-foreground">
                      {consumed.calories.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase">kcal</span>
                  </div>
                </div>
              </div>

              {/* Macros Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Beef className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-bold text-foreground">{consumed.protein}g</span>
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-400 transition-all duration-300"
                      style={{ width: `${Math.min((consumed.protein / plan.protein_goal) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Proteína</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Apple className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-bold text-foreground">{consumed.carbs}g</span>
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-400 transition-all duration-300"
                      style={{ width: `${Math.min((consumed.carbs / plan.carbs_goal) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Carbs</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Droplets className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-bold text-foreground">{consumed.fat}g</span>
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400 transition-all duration-300"
                      style={{ width: `${Math.min((consumed.fat / plan.fat_goal) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Gordura</span>
                </div>
              </div>
            </div>
          </div>

          {/* Meals List */}
          <div className="px-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">
              Refeições do Dia
            </h2>

            <div className="space-y-3">
              {plan.meals.map((meal) => (
                <div
                  key={meal.id}
                  className={`bg-card border rounded-sm p-4 transition-all ${
                    meal.completed 
                      ? "border-primary/50 bg-primary/5" 
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-foreground">{meal.name}</h3>
                      <p className="text-xs text-muted-foreground">{meal.time}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">
                        {meal.calories} kcal
                      </span>
                      {meal.completed && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {meal.foods.map((food, i) => (
                      <span 
                        key={i}
                        className="text-xs bg-muted px-2 py-1 rounded-sm text-muted-foreground"
                      >
                        {food}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => toggleMealCompleted(meal.id)}
                    className={`w-full py-2 rounded-sm font-medium text-sm transition-all ${
                      meal.completed
                        ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {meal.completed ? "Desmarcar" : "Marcar como Consumida"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <BottomNavigation />
    </div>
  );
}
