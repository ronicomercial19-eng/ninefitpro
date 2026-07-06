import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasAssessment } from '@/services/assessmentService';
import StudentHistoryComponent from '@/components/StudentHistoryComponent';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const IndexPage: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [hasAval, setHasAval] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      if (user && role === 'aluno') {
        const result = await hasAssessment(user.id);
        setHasAval(result);
      }
    };
    check();
  }, [user, role]);

  // Se aluno sem avaliação → mostrar CTA
  if (role === 'aluno' && hasAval === false) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">Avaliação pendente</h3>
                <p className="text-sm text-yellow-800 mb-4">
                  Para desbloquear todas as funcionalidades, complete sua avaliação de performance.
                </p>
                <Button
                  onClick={() => navigate('/avaliacao-guiada/select')}
                  className="gap-2"
                  size="sm"
                >
                  Começar Avaliação
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard padrão */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cards rápidos */}
        </div>
      </div>
    );
  }

  // Se aluno com avaliação → mostrar histórico
  if (role === 'aluno' && hasAval === true && user) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Seu Progresso</h1>
          <p className="text-muted-foreground mt-2">Acompanhe sua evolução de performance</p>
        </div>
        <StudentHistoryComponent athleteId={user.id} />
      </div>
    );
  }

  // Dashboard padrão para professor ou outro role
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      {/* Placeholder para conteúdo principal */}
    </div>
  );
};

export default IndexPage;
