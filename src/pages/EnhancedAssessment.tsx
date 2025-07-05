
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionnaireSystem } from "@/components/questionnaire/QuestionnaireSystem";
import { PersonalizedMetrics } from "@/components/dashboard/PersonalizedMetrics";
import { Navigation } from "@/components/shared/Navigation";
import { ArrowLeft, FileText, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EnhancedAssessment = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("questionnaires");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app-dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-black">Avaliação Física Completa</h1>
          <p className="text-gray-600">
            Sistema completo de avaliação e acompanhamento personalizado
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="questionnaires" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Questionários
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Minhas Métricas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questionnaires">
            <QuestionnaireSystem />
          </TabsContent>

          <TabsContent value="metrics">
            <PersonalizedMetrics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedAssessment;
