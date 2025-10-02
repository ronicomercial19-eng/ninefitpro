import { useState } from 'react';
import { Navigation9Fit } from '@/components/shared/Navigation9Fit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, Save, User, Shield, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Perfil() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Perfil atualizado!",
        description: "Suas alterações foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navigation9Fit />
      
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#282E3A] mb-2">Meu Perfil</h1>
          <p className="text-[#666666]">Gerencie suas informações pessoais e preferências</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture Card */}
          <Card className="lg:col-span-1 shadow-card">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-2xl bg-gradient-to-r from-[#FF8426] to-[#F04E23] text-white">
                      {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full btn-9fit"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="text-center">
                  <h2 className="text-xl font-bold text-[#282E3A]">{profile?.full_name || 'Usuário'}</h2>
                  <p className="text-sm text-[#666666]">{profile?.email}</p>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#FF8426]/10 text-[#FF8426]">
                      {profile?.role === 'admin' ? 'Administrador' : profile?.role === 'professor' ? 'Professor' : 'Aluno'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Details */}
          <Card className="lg:col-span-2 shadow-card">
            <CardHeader>
              <CardTitle className="text-[#282E3A]">Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="personal" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Pessoal
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Segurança
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notificações
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo</Label>
                      <Input
                        id="full_name"
                        defaultValue={profile?.full_name || ''}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        defaultValue={profile?.phone || ''}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={profile?.email}
                      disabled
                      className="bg-[#F8FAFB]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Data de Nascimento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      placeholder="DD/MM/AAAA"
                    />
                  </div>

                  <Button 
                    onClick={handleSaveProfile}
                    className="btn-9fit"
                    disabled={loading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Senha Atual</Label>
                    <Input
                      id="current_password"
                      type="password"
                      placeholder="Digite sua senha atual"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new_password">Nova Senha</Label>
                    <Input
                      id="new_password"
                      type="password"
                      placeholder="Digite a nova senha"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      placeholder="Confirme a nova senha"
                    />
                  </div>

                  <Button className="btn-9fit">
                    <Shield className="w-4 h-4 mr-2" />
                    Atualizar Senha
                  </Button>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-[#E5E7EB] rounded-lg">
                      <div>
                        <h3 className="font-medium text-[#282E3A]">Notificações por Email</h3>
                        <p className="text-sm text-[#666666]">Receba atualizações sobre treinos e atividades</p>
                      </div>
                      <input type="checkbox" className="toggle" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-[#E5E7EB] rounded-lg">
                      <div>
                        <h3 className="font-medium text-[#282E3A]">Notificações Push</h3>
                        <p className="text-sm text-[#666666]">Receba lembretes de treinos e metas</p>
                      </div>
                      <input type="checkbox" className="toggle" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-[#E5E7EB] rounded-lg">
                      <div>
                        <h3 className="font-medium text-[#282E3A]">Newsletter</h3>
                        <p className="text-sm text-[#666666]">Receba dicas e novidades da 9FIT</p>
                      </div>
                      <input type="checkbox" className="toggle" />
                    </div>
                  </div>

                  <Button className="btn-9fit">
                    <Bell className="w-4 h-4 mr-2" />
                    Salvar Preferências
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}