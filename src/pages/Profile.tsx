
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Target, 
  Activity,
  Settings,
  Camera,
  Save
} from "lucide-react";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    age: '',
    height: '',
    weight: '',
    goal: 'Hipertrofia',
    experience: 'Intermediário'
  });

  const handleSave = () => {
    // Aqui você salvaria os dados no backend
    setIsEditing(false);
    console.log('Profile saved:', profile);
  };

  const stats = [
    { label: "Treinos Totais", value: "47", icon: Activity },
    { label: "Dias Ativos", value: "32", icon: Calendar },
    { label: "Meta Atual", value: "Hipertrofia", icon: Target }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-black text-white px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <div 
              className="text-2xl font-bold cursor-pointer"
              onClick={() => navigate('/')}
            >
              Fit<span className="text-orange-500">Evolution</span>
            </div>
            <button
              onClick={() => navigate('/app-dashboard')}
              className="text-gray-300 hover:text-white px-3 py-2"
            >
              ← Voltar ao Dashboard
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-gray-300">Perfil</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="p-8 mb-8">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-black rounded-full flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-black mb-2">
                {profile.name || 'Usuário FitEvolution'}
              </h1>
              <p className="text-gray-600 mb-4">{profile.email}</p>
              <div className="flex space-x-2">
                <Badge className="bg-orange-500 text-black">{profile.experience}</Badge>
                <Badge variant="outline">{profile.goal}</Badge>
              </div>
            </div>

            <Button
              onClick={() => setIsEditing(!isEditing)}
              className={isEditing ? "bg-green-500 hover:bg-green-600" : "bg-orange-500 hover:bg-orange-600"}
            >
              {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
              {isEditing ? 'Salvar' : 'Editar'}
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats */}
          <div className="lg:col-span-1">
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold text-black mb-4">Estatísticas</h3>
              <div className="space-y-4">
                {stats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <stat.icon className="w-5 h-5 text-orange-500" />
                      <span className="text-gray-600">{stat.label}</span>
                    </div>
                    <span className="font-semibold text-black">{stat.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Conquistas</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-black">30</span>
                  </div>
                  <span className="text-sm text-gray-600">30 dias consecutivos</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">💪</span>
                  </div>
                  <span className="text-sm text-gray-600">Primeira meta alcançada</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-black mb-6">Informações Pessoais</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    disabled={!isEditing}
                    placeholder="(11) 99999-9999"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="age">Idade</Label>
                  <Input
                    id="age"
                    value={profile.age}
                    onChange={(e) => setProfile({...profile, age: e.target.value})}
                    disabled={!isEditing}
                    placeholder="25"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    value={profile.height}
                    onChange={(e) => setProfile({...profile, height: e.target.value})}
                    disabled={!isEditing}
                    placeholder="175"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    value={profile.weight}
                    onChange={(e) => setProfile({...profile, weight: e.target.value})}
                    disabled={!isEditing}
                    placeholder="70"
                    className="mt-1"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end space-x-4 mt-6 pt-6 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSave}
                    className="bg-orange-500 hover:bg-orange-600 text-black"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
