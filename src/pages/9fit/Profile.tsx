import { useState, useEffect } from "react";
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  CreditCard, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Camera,
  Flame,
  Dumbbell,
  Calendar,
  Loader2,
  Edit3
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { SkeletonCard } from "@/components/9fit/SkeletonCard";
import { toast } from "sonner";

interface UserStats {
  calories: number;
  workouts: number;
  streak: number;
}

interface AthleteProfile {
  id: string;
  name: string;
  phone?: string;
  birthdate?: string;
  peso_kg?: number;
  altura_cm?: number;
  objetivo?: string;
  nivel?: string;
}

const menuItems = [
  { icon: Bell, label: "Notificações", path: "/9fit/settings/notifications" },
  { icon: Shield, label: "Privacidade", path: "/9fit/settings/privacy" },
  { icon: CreditCard, label: "Assinatura", path: "/9fit/premium" },
  { icon: HelpCircle, label: "Ajuda & Suporte", path: "/9fit/support" },
];

export default function NineFitProfile() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    calories: 0,
    workouts: 0,
    streak: 0
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);

    try {
      // Fetch athlete profile linked to this user
      const { data: athleteData, error } = await supabase
        .from("athletes")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (!error && athleteData) {
        setAthleteProfile(athleteData);

        // Fetch workout stats
        const { data: progressData } = await supabase
          .from("progresso_aluno")
          .select("*")
          .eq("id_aluno", athleteData.id);

        if (progressData) {
          setStats({
            calories: progressData.length * 250, // Estimate
            workouts: progressData.length,
            streak: Math.min(progressData.length, 7)
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/9fit/login");
  };

  const displayName = athleteProfile?.name || profile?.full_name || user?.email?.split("@")[0] || "Usuário";
  const displayEmail = user?.email || "";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
          Meu Perfil
        </h1>
        <button 
          onClick={() => navigate("/9fit/settings")}
          className="p-2 hover:bg-muted rounded-sm transition-colors"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="px-4">
          <SkeletonCard variant="profile" />
        </div>
      ) : (
        <>
          {/* Digital ID Card */}
          <div className="px-4 mb-6">
            <div className="bg-gradient-to-br from-card to-muted border border-border rounded-sm p-6 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 right-0 w-32 h-32 border border-foreground rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 border border-foreground rounded-full translate-y-1/2 -translate-x-1/2" />
              </div>

              <div className="relative flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 bg-muted rounded-sm flex items-center justify-center overflow-hidden">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <Camera className="w-4 h-4 text-primary-foreground" />
                  </button>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-black uppercase text-foreground">
                        {displayName}
                      </h2>
                      <p className="text-xs text-muted-foreground mb-3">{displayEmail}</p>
                    </div>
                    <button className="p-2 hover:bg-muted/50 rounded-sm transition-colors">
                      <Edit3 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex gap-4">
                    <div>
                      <p className="text-xl font-black text-primary flex items-center gap-1">
                        <Flame className="w-4 h-4" />
                        {stats.calories.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">Calorias</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-foreground flex items-center gap-1">
                        <Dumbbell className="w-4 h-4 text-muted-foreground" />
                        {stats.workouts}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">Treinos</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {stats.streak}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">Sequência</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badge */}
              <div className="absolute top-4 right-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary border border-primary px-2 py-1 rounded-sm">
                  PRO
                </span>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          {athleteProfile && (
            <div className="px-4 mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">
                Informações Pessoais
              </h3>
              <div className="bg-card border border-border rounded-sm divide-y divide-border">
                {athleteProfile.peso_kg && (
                  <div className="flex items-center justify-between p-4">
                    <span className="text-sm text-muted-foreground">Peso</span>
                    <span className="text-sm font-medium text-foreground">
                      {athleteProfile.peso_kg} kg
                    </span>
                  </div>
                )}
                {athleteProfile.altura_cm && (
                  <div className="flex items-center justify-between p-4">
                    <span className="text-sm text-muted-foreground">Altura</span>
                    <span className="text-sm font-medium text-foreground">
                      {athleteProfile.altura_cm} cm
                    </span>
                  </div>
                )}
                {athleteProfile.objetivo && (
                  <div className="flex items-center justify-between p-4">
                    <span className="text-sm text-muted-foreground">Objetivo</span>
                    <span className="text-sm font-medium text-primary capitalize">
                      {athleteProfile.objetivo}
                    </span>
                  </div>
                )}
                {athleteProfile.nivel && (
                  <div className="flex items-center justify-between p-4">
                    <span className="text-sm text-muted-foreground">Nível</span>
                    <span className="text-sm font-medium text-foreground capitalize">
                      {athleteProfile.nivel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Menu */}
          <div className="px-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">
              Configurações
            </h3>
            <div className="bg-card border border-border rounded-sm overflow-hidden divide-y divide-border">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => toast.info("Em breve!")}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted transition-colors"
                >
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-left text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-4 mt-4 bg-card border border-border rounded-sm hover:bg-destructive/10 hover:border-destructive/30 transition-colors group"
            >
              <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-destructive" />
              <span className="text-sm font-medium text-foreground group-hover:text-destructive">
                Sair
              </span>
            </button>
          </div>
        </>
      )}

      {/* Version */}
      <div className="text-center mt-8">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          9FIT PRO v2.0.0
        </p>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
