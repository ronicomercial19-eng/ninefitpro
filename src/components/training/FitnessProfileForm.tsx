
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Target, Dumbbell, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FitnessProfile {
  name: string;
  age?: number;
  gender?: 'male' | 'female';
  height?: number;
  weight?: number;
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
  experience_months?: number;
  weekly_frequency?: number;
  session_duration?: string;
  primary_goal?: string;
  injuries_limitations?: string;
  training_environment?: string;
}

const goalOptions = [
  'Hipertrofia', 'Força', 'Resistência', 'Perda de Peso', 
  'Condicionamento Físico Geral', 'Reabilitação', 'Performance Esportiva',
  'Mobilidade', 'Flexibilidade', 'Ganho de Potência', 'Definição Muscular', 'Saúde e Bem-Estar'
];

const trainingTypes = [
  'Musculação Clássica', 'Treino Funcional', 'Cross Training', 'Calistenia',
  'Pilates', 'Yoga', 'Corrida', 'Natação', 'Lutas', 'Esportes Coletivos'
];

const equipmentOptions = [
  'Peso corporal', 'Halteres', 'Barra', 'Máquinas de academia', 'Elásticos',
  'Kettlebell', 'TRX', 'Banco', 'Bola Suíça', 'Caneleiras', 'Roda Abdominal'
];

const environmentOptions = ['Academia', 'Casa', 'Ar Livre', 'Estúdio'];

export const FitnessProfileForm = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FitnessProfile>({
    name: '',
    primary_goal: '',
    training_environment: ''
  });
  const [loading, setLoading] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      fetchExistingProfile();
    }
  }, [user]);

  const fetchExistingProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.log('No existing profile found');
        return;
      }

      if (data) {
        setProfile({
          name: data.name,
          age: data.age || undefined,
          gender: data.gender as 'male' | 'female' || undefined,
          height: data.height || undefined,
          weight: data.weight || undefined,
          experience_level: data.experience_level as 'beginner' | 'intermediate' | 'advanced' || undefined,
          experience_months: data.experience_months || undefined,
          weekly_frequency: data.weekly_frequency || undefined,
          session_duration: data.session_duration || undefined,
          primary_goal: data.primary_goal || undefined,
          injuries_limitations: data.injuries_limitations || undefined,
          training_environment: data.training_environment || undefined
        });
        setHasExistingProfile(true);
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const profileData = {
        ...profile,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      if (hasExistingProfile) {
        const { error } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user.id);
        
        if (error) throw error;
        toast.success('Perfil atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('user_profiles')
          .insert(profileData);
        
        if (error) throw error;
        toast.success('Perfil criado com sucesso!');
        setHasExistingProfile(true);
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Perfil Fitness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome */}
            <div>
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            {/* Dados Demográficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="age">Idade</Label>
                <Input
                  id="age"
                  type="number"
                  value={profile.age || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="gender">Sexo</Label>
                <Select value={profile.gender} onValueChange={(value: 'male' | 'female') => setProfile(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={profile.height || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={profile.weight || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, weight: parseFloat(e.target.value) }))}
                />
              </div>
            </div>

            {/* Experiência */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="experience_level">Nível de Experiência</Label>
                <Select value={profile.experience_level} onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => setProfile(prev => ({ ...prev, experience_level: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante (0-6 meses)</SelectItem>
                    <SelectItem value="intermediate">Intermediário (6-24 meses)</SelectItem>
                    <SelectItem value="advanced">Avançado (mais de 24 meses)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="experience_months">Experiência (meses)</Label>
                <Input
                  id="experience_months"
                  type="number"
                  value={profile.experience_months || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, experience_months: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="weekly_frequency">Dias por semana</Label>
                <Select value={profile.weekly_frequency?.toString()} onValueChange={(value) => setProfile(prev => ({ ...prev, weekly_frequency: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7].map(day => (
                      <SelectItem key={day} value={day.toString()}>{day} dias</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duração da Sessão */}
            <div>
              <Label htmlFor="session_duration">Duração da Sessão</Label>
              <Select value={profile.session_duration} onValueChange={(value) => setProfile(prev => ({ ...prev, session_duration: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar duração" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30-45 min">30-45 minutos</SelectItem>
                  <SelectItem value="45-60 min">45-60 minutos</SelectItem>
                  <SelectItem value="60-90 min">60-90 minutos</SelectItem>
                  <SelectItem value="90+ min">Mais de 90 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Objetivo Principal */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <Target className="w-4 h-4" />
                Objetivo Principal
              </Label>
              <Select value={profile.primary_goal} onValueChange={(value) => setProfile(prev => ({ ...prev, primary_goal: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar objetivo" />
                </SelectTrigger>
                <SelectContent>
                  {goalOptions.map(goal => (
                    <SelectItem key={goal} value={goal}>{goal}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lesões e Limitações */}
            <div>
              <Label htmlFor="injuries">Lesões e Limitações Físicas</Label>
              <Textarea
                id="injuries"
                placeholder="Descreva lesões passadas, dores crônicas ou limitações médicas..."
                value={profile.injuries_limitations || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, injuries_limitations: e.target.value }))}
              />
            </div>

            {/* Ambiente de Treino */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4" />
                Ambiente de Treino Preferido
              </Label>
              <Select value={profile.training_environment} onValueChange={(value) => setProfile(prev => ({ ...prev, training_environment: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar ambiente" />
                </SelectTrigger>
                <SelectContent>
                  {environmentOptions.map(env => (
                    <SelectItem key={env} value={env}>{env}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Salvando...' : hasExistingProfile ? 'Atualizar Perfil' : 'Criar Perfil'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
