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
  Trash2
} from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NutritionLogForm } from "@/components/9fit/NutritionLogForm";

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
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [assignedDiets, setAssignedDiets] = useState<DietAssignment[]>([]);
  const [selectedDiet, setSelectedDiet] = useState<DietAssignment | null>(null);
  const [dietContent, setDietContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  
  // Mock nutrition tracking (keep for future feature)
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [consumed, setConsumed] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  // Fetch assigned diets from database
  useEffect(() => {
    const fetchAssignedDiets = async () => {
      if (!user) return;
      
      setLoading(true);
      
      try {
        // First, find the athlete record for this user
        let athleteId: string | null = null;
        
        // Try direct lookup via user_id
        const { data: athleteData } = await supabase
          .from('athletes')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (athleteData) {
          athleteId = athleteData.id;
        }
        
        // Fallback: Try athlete_auth_link
        if (!athleteId) {
          const { data: linkData } = await supabase
            .from('athlete_auth_link')
            .select('athlete_id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (linkData) {
            athleteId = linkData.athlete_id;
          }
        }
        
        // Fallback: Try by email
        if (!athleteId && user.email) {
          const { data: emailData } = await supabase
            .from('athletes')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();
          
          if (emailData) {
            athleteId = emailData.id;
          }
        }
        
        if (!athleteId) {
          console.log('No athlete found for user');
          setAssignedDiets([]);
          setLoading(false);
          return;
        }
        
        console.log('Found athlete ID:', athleteId);
        
        // Fetch ALL active diet assignments for this student
        const { data: diets, error } = await supabase
          .from('student_diet_assignments')
          .select('*')
          .eq('student_id', athleteId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Filter by date client-side for more reliable results
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const validDiets = (diets || []).filter(diet => {
          const startDate = parseISO(diet.start_date);
          const endDate = diet.end_date ? parseISO(diet.end_date) : null;
          
          const startValid = isBefore(startDate, today) || isEqual(startDate, today);
          const endValid = !endDate || isAfter(endDate, today) || isEqual(endDate, today);
          
          return startValid && endValid;
        });
        
        console.log('Found diets:', validDiets.length);
        setAssignedDiets(validDiets);
      } catch (error) {
        console.error('Error fetching diets:', error);
        toast.error('Erro ao carregar planos alimentares');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedDiets();
  }, [user]);

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

      {loading ? (
        <div className="px-4">
          <DietaSkeleton />
        </div>
      ) : assignedDiets.length === 0 ? (
        <div className="px-4">
          <EmptyDieta />
        </div>
      ) : (
        <div className="px-4 space-y-6">
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

          {/* Quick Macros Section (placeholder for future) */}
          <div className="bg-card border border-border rounded-sm p-4 opacity-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Acompanhamento Diário
              </h2>
              <Badge variant="secondary">Em breve</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Registre suas refeições e acompanhe seus macros diariamente.
            </p>
          </div>
        </div>
      )}

      {/* Fullscreen Diet Viewer Dialog */}
      <Dialog open={!!selectedDiet} onOpenChange={() => setSelectedDiet(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100dvh] p-0 m-0 bg-white rounded-none border-none">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-background flex-shrink-0">
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
          <div className="flex-1 overflow-auto" style={{ height: 'calc(100dvh - 60px)' }}>
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

      <BottomNavigation />
    </div>
  );
}
