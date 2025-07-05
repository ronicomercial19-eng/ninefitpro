
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { User, Target, Dumbbell, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FitnessProfile {
  age?: number;
  biological_sex?: 'male' | 'female';
  height_cm?: number;
  weight_kg?: number;
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
  experience_months?: number;
  weekly_availability?: number;
  session_duration?: string;
  primary_goals: string[];
  injuries_limitations?: string;
  preferred_training_types: string[];
  available_equipment: string[];
  preferred_environments: string[];
  preferred_stimuli: string[];
  priority_muscle_groups: string[];
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

const stimuliOptions = [
  'Resistência Muscular', 'Pliometria', 'Treino de Força Máxima',
  'Treino Metabólico', 'Mobilidade', 'Estabilização'
];

const muscleGroups = [
  'Glúteos', 'Ombros', 'Costas', 'Abdômen', 'Pernas', 'Peito', 'Braços'
];

export const FitnessProfileForm = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FitnessProfile>({
    primary_goals: [],
    preferred_training_types: [],
    available_equipment: [],
    preferred_environments: [],
    preferred_stimuli: [],
    priority_muscle_groups: []
  });
  const [loading, setLoading] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      fetchExistingProfile();
    }
  }, [user]);

  const fetchExistingProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_fitness_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (data) {
        setProfile(data);
        setHasExistingProfile(true);
      }
    } catch (error) {
      console.log('No existing profile found');
    }
  };

  const handleArrayToggle = (field: keyof FitnessProfile, value: string) => {
    const currentArray = profile[field] as string[] || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    setProfile(prev => ({ ...prev, [field]: newArray }));
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
          .from('user_fitness_profiles')
          .update(profileData)
          .eq('user_id', user.id);
        
        if (error) throw error;
        toast.success('Perfil atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('user_fitness_profiles')
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
            Perfil Fitness Avançado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                <Label htmlFor="biological_sex">Sexo Biológico</Label>
                <Select value={profile.biological_sex} onValueChange={(value: 'male' | 'female') => setProfile(prev => ({ ...prev, biological_sex: value }))}>
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
                  value={profile.height_cm || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, height_cm: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={profile.weight_kg || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, weight_kg: parseFloat(e.target.value) }))}
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
                <Label htmlFor="weekly_availability">Dias por semana</Label>
                <Select value={profile.weekly_availability?.toString()} onValueChange={(value) => setProfile(prev => ({ ...prev, weekly_availability: parseInt(value) }))}>
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

            {/* Objetivos */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <Target className="w-4 h-4" />
                Objetivos Primários (até 3)
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {goalOptions.map(goal => (
                  <div key={goal} className="flex items-center space-x-2">
                    <Checkbox
                      id={goal}
                      checked={profile.primary_goals.includes(goal)}
                      onCheckedChange={() => handleArrayToggle('primary_goals', goal)}
                      disabled={!profile.primary_goals.includes(goal) && profile.primary_goals.length >= 3}
                    />
                    <Label htmlFor={goal} className="text-sm">{goal}</Label>
                  </div>
                ))}
              </div>
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

            {/* Preferências de Treino */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <Dumbbell className="w-4 h-4" />
                Tipos de Treino Preferidos
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {trainingTypes.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={profile.preferred_training_types.includes(type)}
                      onCheckedChange={() => handleArrayToggle('preferred_training_types', type)}
                    />
                    <Label htmlFor={type} className="text-sm">{type}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Equipamentos */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Equipamentos Disponíveis</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {equipmentOptions.map(equipment => (
                  <div key={equipment} className="flex items-center space-x-2">
                    <Checkbox
                      id={equipment}
                      checked={profile.available_equipment.includes(equipment)}
                      onCheckedChange={() => handleArrayToggle('available_equipment', equipment)}
                    />
                    <Label htmlFor={equipment} className="text-sm">{equipment}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Ambientes */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4" />
                Ambientes Preferidos
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {environmentOptions.map(env => (
                  <div key={env} className="flex items-center space-x-2">
                    <Checkbox
                      id={env}
                      checked={profile.preferred_environments.includes(env)}
                      onCheckedChange={() => handleArrayToggle('preferred_environments', env)}
                    />
                    <Label htmlFor={env} className="text-sm">{env}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Estímulos Preferidos */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Estímulos Preferidos</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {stimuliOptions.map(stimulus => (
                  <div key={stimulus} className="flex items-center space-x-2">
                    <Checkbox
                      id={stimulus}
                      checked={profile.preferred_stimuli.includes(stimulus)}
                      onCheckedChange={() => handleArrayToggle('preferred_stimuli', stimulus)}
                    />
                    <Label htmlFor={stimulus} className="text-sm">{stimulus}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Grupos Musculares a Priorizar */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Grupos Musculares a Priorizar</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {muscleGroups.map(group => (
                  <div key={group} className="flex items-center space-x-2">
                    <Checkbox
                      id={group}
                      checked={profile.priority_muscle_groups.includes(group)}
                      onCheckedChange={() => handleArrayToggle('priority_muscle_groups', group)}
                    />
                    <Label htmlFor={group} className="text-sm">{group}</Label>
                  </div>
                ))}
              </div>
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
