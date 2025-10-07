import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Bot, Zap } from 'lucide-react';
import { AITrainingQuestionnaire } from '@/components/ai-training/AITrainingQuestionnaire';
import { toast } from 'sonner';

export default function AITrainingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [aiTrainings, setAiTrainings] = useState<any[]>([]);

  const handleQuestionnaireComplete = async (data: any) => {
    toast.success('Processando dados com IA...');
    
    // Aqui você implementaria a chamada para a IA
    // Por exemplo, usando o Lovable AI Gateway
    
    setTimeout(() => {
      toast.success('Treino gerado com sucesso!');
      setShowQuestionnaire(false);
      // Adicionar o novo treino à lista
      setAiTrainings(prev => [...prev, {
        id: Date.now(),
        name: `Treino ${data.studentName}`,
        color: 'bg-blue-500',
        data
      }]);
    }, 2000);
  };

  if (showQuestionnaire) {
    return (
      <AITrainingQuestionnaire
        onComplete={handleQuestionnaireComplete}
        onCancel={() => setShowQuestionnaire(false)}
      />
    );
  }

  const filteredTrainings = aiTrainings.filter(training =>
    training.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Treino com IA</h1>
        <Button 
          className="bg-green-500 hover:bg-green-600"
          onClick={() => setShowQuestionnaire(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo treino com IA
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-blue-800">
              O treino com IA pode ser usado como um treino completo para ser copiado para seus alunos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Trainings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrainings.map((training) => (
          <Card key={training.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-4 h-20 ${training.color} rounded`}></div>
                <div className="flex-1 ml-4">
                  <h3 className="font-semibold text-lg mb-2">{training.name}</h3>
                  <div className="flex items-center gap-2 mb-4">
                    <Bot className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-blue-600 font-medium">Gerado por IA</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Editar
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Copiar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTrainings.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum treino com IA encontrado</h3>
              <p className="text-muted-foreground">Tente ajustar a pesquisa ou crie um novo treino com IA.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}