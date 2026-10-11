import { useState, useEffect } from "react";
import { format, parseISO, isAfter, isBefore, isEqual } from "date-fns";
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
  CheckCircle,
  Eye,
  ExternalLink,
  Globe,
  FileText,
  X,
  Calendar,
  Trash2,
  Camera,
  ScanLine,
  Sparkles
} from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NutritionLogForm } from "@/components/9fit/NutritionLogForm";
import { FoodScannerModal } from "@/components/9fit/FoodScannerModal";
import { useSearchParams } from 'react-router-dom';
import { NutritionTodaySummary } from '@/components/9fit/NutritionTodaySummary';

interface DietAssignment {
  id: string;
  diet_name: string;
  diet_description: string | null;
  diet_type: string;
  diet_file_url: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

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
        Nenhum plano alimentar disponível
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Seu professor ainda não atribuiu um plano alimentar para você.
      </p>
    </div>
  );
}

// Inject mobile viewport meta tag into HTML content
function injectMobileViewport(html: string): string {
  const viewportTag = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">';
  const mobileStyles = `<style>
    * { box-sizing: border-box; }
    body { max-width: 100vw !important; overflow-x: hidden !important; margin: 0; padding: 8px; }
    table { width: 100% !important; max-width: 100vw !important; table-layout: fixed !important; font-size: 12px !important; }
    td, th { word-wrap: break-word !important; overflow-wrap: break-word !important; padding: 4px !important; }
    img { max-width: 100% !important; height: auto !important; }
  </style>`;
  
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${viewportTag}${mobileStyles}`);
  } else if (html.includes('<html')) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${viewportTag}${mobileStyles}</head>`);
  }
  return `<!DOCTYPE html><html><head>${viewportTag}${mobileStyles}</head><body>${html}</body></html>`;
}

export default function NineFitDieta() {
  const [searchParams,setSearchParams]=useSearchParams();
  const { user } = useAuth();
  const { athleteId, loading: athleteLoading } = useAthleteId();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [assignedDiets, setAssignedDiets] = useState<DietAssignment[]>([]);
  const [selectedDiet, setSelectedDiet] = useState<DietAssignment | null>(null);
  const [dietContent, setDietContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  // Real nutrition tracking from nutrition_logs
  const [consumed, setConsumed] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [dietMode, setDietMode] = useState<"assigned" | "self_guided" | "inactive">("self_guided");
  const [caloriesGoal, setCaloriesGoal] = useState<number | null>(null);
  useEffect(()=>{if(searchParams.get('action')==='log'&&athleteId){setCurrentDate(new Date());setShowLogForm(true);const next=new URLSearchParams(searchParams);next.delete('action');setSearchParams(next,{replace:true});}},[searchParams,athleteId,setSearchParams]);

  const fetchNutritionLogs = async (aid: string) => {
    const today = format(currentDate, "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("nutrition_logs")
      .select("*")
      .eq("athlete_id", aid)
      .eq("date", today)
      .order("created_at", { ascending: true });
    
    if (error) { toast.error("Não foi possível atualizar o diário alimentar."); return; }
    const meals = data || [];
    setTodayMeals(meals);
    setConsumed({
      calories: meals.reduce((s: number, m: any) => s + Number(m.calories || 0), 0),
      protein: meals.reduce((s: number, m: any) => s + Number(m.protein || 0), 0),
      carbs: meals.reduce((s: number, m: any) => s + Number(m.carbs || 0), 0),
      fat: meals.reduce((s: number, m: any) => s + Number(m.fat || 0), 0),
    });
  };

  const deleteMeal = async (id: string) => {
    const { error } = await supabase.from("nutrition_logs").delete().eq("id", id).eq("athlete_id", athleteId!);
    if (error) { toast.error("Não foi possível remover a refeição."); return; }
    window.dispatchEvent(new Event("9fit:nutrition-updated"));
    if (athleteId) fetchNutritionLogs(athleteId);
    toast.success("Refeição removida");
  };

  // Fetch assigned diets from database
  const fetchAssignedDiets = async () => {
    if (!athleteId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: diets, error } = await supabase
        .from('student_diet_assignments')
        .select('*')
        .eq('student_id', athleteId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const validDiets = (diets || []).filter(diet => {
        const startDate = parseISO(diet.start_date);
        const endDate = diet.end_date ? parseISO(diet.end_date) : null;
        const startValid = isBefore(startDate, today) || isEqual(startDate, today);
        const endValid = !endDate || isAfter(endDate, today) || isEqual(endDate, today);
        return startValid && endValid;
      });
      setAssignedDiets(validDiets);
    } catch (error) {
      console.error('Error fetching diets:', error);
      toast.error('Erro ao carregar planos alimentares');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssignedDiets(); if (athleteId) supabase.from("vw_fitpro_diet_context" as any).select("diet_mode,diet_data").eq("athlete_id", athleteId).maybeSingle().then(({ data }) => { const row: any = data || {}; setDietMode(row.diet_mode || "self_guided"); const goal = Number(row.diet_data?.calories_goal || row.diet_data?.daily_calories || 0); setCaloriesGoal(goal > 0 ? goal : null); }); }, [athleteId]);

  // Listener para abertura do scanner via evento global
  useEffect(() => {
    const onOpenScanner = () => setShowScanner(true);
    window.addEventListener("9fit:open-food-scanner", onOpenScanner);
    return () => window.removeEventListener("9fit:open-food-scanner", onOpenScanner);
  }, []);

  // Realtime: re-fetch when diet assignments change for this student
  useRealtimeTable(
    { table: "student_diet_assignments", filter: athleteId ? `student_id=eq.${athleteId}` : undefined, enabled: !!athleteId },
    () => fetchAssignedDiets(),
  );

  // Fetch nutrition logs when date changes
  useEffect(() => {
    if (athleteId) fetchNutritionLogs(athleteId);
  }, [athleteId, currentDate]);

  useEffect(() => {
    const refresh = () => { if (athleteId) void fetchNutritionLogs(athleteId); };
    window.addEventListener("9fit:nutrition-updated", refresh);
    return () => window.removeEventListener("9fit:nutrition-updated", refresh);
  }, [athleteId, currentDate]);

  // Realtime: refresh logs when nutrition_logs change
  useRealtimeTable(
    { table: "nutrition_logs", filter: athleteId ? `athlete_id=eq.${athleteId}` : undefined, enabled: !!athleteId },
    () => { if (athleteId) fetchNutritionLogs(athleteId); },
  );

  // Open diet viewer
  const handleOpenDiet = async (diet: DietAssignment) => {
    setSelectedDiet(diet);
    
    if (diet.diet_type === 'link') {
      // For links, just show the dialog with link info
      setDietContent('');
      return;
    }
    
    if (diet.diet_file_url) {
      setLoadingContent(true);
      try {
        const response = await fetch(diet.diet_file_url);
        let content = await response.text();
        
        // Decode HTML entities if content was escaped
        if (content.includes('&lt;') || content.includes('&gt;')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(`<!doctype html><body>${content}`, 'text/html');
          content = doc.body.textContent || '';
        }
        
        // If content doesn't look like HTML, wrap it
        if (!content.trim().startsWith('<') && !content.trim().startsWith('<!')) {
          content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.6; }
  </style>
</head>
<body>
  <pre style="white-space: pre-wrap;">${content}</pre>
</body>
</html>`;
        }
        
        setDietContent(content);
      } catch (error) {
        console.error('Error fetching diet content:', error);
        toast.error('Erro ao carregar conteúdo');
      } finally {
        setLoadingContent(false);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getTypeBadge = (type: string) => {
    if (type === 'link') {
      return <Badge className="bg-blue-100 text-blue-800"><Globe className="w-3 h-3 mr-1" />Link</Badge>;
    }
    return <Badge className="bg-purple-100 text-purple-800"><FileText className="w-3 h-3 mr-1" />Documento</Badge>;
  };

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

      <div className="px-4 mb-4"><NutritionTodaySummary interactive /></div>
      {loading ? (
        <div className="px-4">
          <DietaSkeleton />
        </div>
      ) : assignedDiets.length === 0 ? (
        <div className="px-4 space-y-5">
          {/* Scanner de Alimentos IA Banner */}
          <div className="rounded-xl bg-gradient-to-r from-primary/20 via-[#111218] to-black border border-primary/30 p-3.5 shadow-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0 shadow-inner">
                <ScanLine className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-bold block">
                  NOVO // SCANNER DE ALIMENTO IA
                </span>
                <p className="text-sm font-bold text-white truncate">Escanear Prato ou Rótulo</p>
                <p className="text-[11px] text-neutral-400 truncate">Foto rápida calcula calorias e macros</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowScanner(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shrink-0 text-xs shadow cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              Escanear
            </Button>
          </div>

          <div className="bg-card border border-border rounded-sm p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Modo {dietMode === "self_guided" ? "autoguiado" : "sem plano ativo"}</p>
            <h2 className="text-lg font-bold text-foreground mt-1">Construa sua consistência alimentar</h2>
            <p className="text-sm text-muted-foreground mt-2">Registre refeições, acompanhe médias e ajuste suas escolhas com apoio do RON.</p>
          </div>
          <div className="bg-card border border-border rounded-sm p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Calorias registradas hoje</span>
              <div className="flex items-center gap-1.5">
                <Button size="sm" onClick={() => setShowScanner(true)} className="bg-primary text-primary-foreground font-semibold text-xs">
                  <Camera className="w-3.5 h-3.5 mr-1" />Escanear
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowLogForm(true)} className="text-xs">
                  <Plus className="w-3 h-3 mr-1" />Manual
                </Button>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{consumed.calories} kcal</p>
            <p className="text-xs text-muted-foreground mt-1">{caloriesGoal?`Meta prescrita: ${caloriesGoal} kcal`:'Sem meta calórica prescrita'}</p>
          </div>
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {/* Scanner de Alimentos IA Banner */}
          <div className="rounded-xl bg-gradient-to-r from-primary/20 via-[#111218] to-black border border-primary/30 p-3.5 shadow-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0 shadow-inner">
                <ScanLine className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-bold block">
                  NOVO // SCANNER DE ALIMENTO IA
                </span>
                <p className="text-sm font-bold text-white truncate">Escanear Prato ou Rótulo</p>
                <p className="text-[11px] text-neutral-400 truncate">Calcule proteínas, calorias e porções</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowScanner(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shrink-0 text-xs shadow cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              Escanear
            </Button>
          </div>

          {/* Assigned Diets Section */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-primary" />
              Meus Planos Alimentares
            </h2>
            
            <div className="space-y-3">
              {assignedDiets.map((diet) => (
                <div
                  key={diet.id}
                  className="bg-card border border-border rounded-sm p-4 transition-all hover:border-primary/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground">{diet.diet_name}</h3>
                        {getTypeBadge(diet.diet_type)}
                      </div>
                      
                      {diet.diet_description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {diet.diet_description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Desde {formatDate(diet.start_date)}
                        </span>
                        {diet.end_date && (
                          <span>até {formatDate(diet.end_date)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleOpenDiet(diet)}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Completo
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Nutrition Tracking */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" />
                Acompanhamento Diário
              </h2>
              <div className="flex items-center gap-1.5">
                <Button size="sm" onClick={() => setShowScanner(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs cursor-pointer">
                  <Camera className="w-3.5 h-3.5 mr-1" />Escanear
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowLogForm(true)} className="border-primary text-primary hover:bg-primary/10 text-xs cursor-pointer">
                  <Plus className="w-3 h-3 mr-1" />Manual
                </Button>
              </div>
            </div>

            {/* Calorie Progress Bar */}
            <div className="bg-card border border-border rounded-sm p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Calorias</span>
                <span className="text-sm font-bold text-foreground">{consumed.calories} kcal{caloriesGoal?` / ${caloriesGoal}`:' · sem meta prescrita'}</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500" 
                  style={{ width: `${caloriesGoal?Math.min(100, (consumed.calories / caloriesGoal) * 100):0}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Proteína</p>
                  <p className="text-sm font-bold text-foreground">{consumed.protein}g</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Carbs</p>
                  <p className="text-sm font-bold text-foreground">{consumed.carbs}g</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Gordura</p>
                  <p className="text-sm font-bold text-foreground">{consumed.fat}g</p>
                </div>
              </div>
            </div>

            {/* Today's meals */}
            {todayMeals.length > 0 ? (
              <div className="space-y-2">
                {todayMeals.map((meal) => (
                  <div key={meal.id} className="bg-card border border-border rounded-sm p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{meal.meal_name}</p>
                      <p className="text-[10px] text-muted-foreground">{meal.calories} kcal • P:{meal.protein}g C:{meal.carbs}g G:{meal.fat}g</p>
                    </div>
                    <button onClick={() => deleteMeal(meal.id)} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-sm p-4 text-center">
                <p className="text-xs text-muted-foreground">Nenhuma refeição registrada hoje</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Diet Viewer Dialog */}
      <Dialog open={!!selectedDiet} onOpenChange={() => setSelectedDiet(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100dvh] p-0 m-0 bg-[#0f0f0f] text-foreground rounded-none border-none">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-primary/20 bg-[#0f0f0f] flex-shrink-0">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm truncate">{selectedDiet?.diet_name}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedDiet?.diet_type === 'link' ? 'Link externo' : 'Plano alimentar'}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {selectedDiet?.diet_type === 'link' && selectedDiet.diet_file_url && (
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                  <a 
                    href={selectedDiet.diet_file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedDiet(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto bg-[#0f0f0f]" style={{ height: 'calc(100dvh - 60px)' }}>
            {loadingContent ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : selectedDiet?.diet_type === 'link' ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Globe className="w-20 h-20 text-muted-foreground mb-6" />
                <h3 className="text-xl font-bold mb-2">Link Externo</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Este plano alimentar está hospedado em um link externo.
                </p>
                <Button asChild size="lg">
                  <a 
                    href={selectedDiet?.diet_file_url || ''} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Abrir Plano Alimentar
                  </a>
                </Button>
              </div>
            ) : (
              <iframe
                srcDoc={injectMobileViewport(dietContent)}
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
                title="Plano Alimentar"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Nutrition Log Form */}
      {athleteId && (
        <NutritionLogForm
          open={showLogForm}
          onClose={() => setShowLogForm(false)}
          athleteId={athleteId}
          date={format(currentDate,"yyyy-MM-dd")}
          onSaved={() => { setCurrentDate(new Date()); if (athleteId) void fetchNutritionLogs(athleteId); }}
        />
      )}

      {/* Food Scanner Modal */}
      {athleteId && (
        <FoodScannerModal
          open={showScanner}
          onClose={() => setShowScanner(false)}
          athleteId={athleteId}
          onSaved={() => { setCurrentDate(new Date()); if (athleteId) void fetchNutritionLogs(athleteId); }}
        />
      )}

      {/* Floating Action Buttons */}
      {athleteId && (
        <div className="fixed bottom-24 right-4 flex flex-col gap-2.5 z-40">
          <button
            onClick={() => setShowScanner(true)}
            className="w-12 h-12 bg-[#12131a] border border-primary/50 text-primary rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
            title="Escanear Prato / Alimento com IA"
          >
            <Camera className="w-5 h-5 animate-pulse" />
          </button>
          <button
            onClick={() => setShowLogForm(true)}
            className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
            title="Registrar Refeição Manualmente"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}
