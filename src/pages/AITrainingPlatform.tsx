
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrainingPlanGenerator } from "@/components/training/TrainingPlanGenerator";
import { ExerciseDatabase } from "@/components/training/ExerciseDatabase";
import { ProgressionEngine } from "@/components/training/ProgressionEngine";
import { Zap, Database, TrendingUp, Brain, Target, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AITrainingPlatform = () => {
  const navigate = useNavigate();

  const platformStats = [
    {
      icon: <Brain className="w-8 h-8 text-orange-500" />,
      title: "Planos Gerados",
      value: "1,247",
      description: "Treinos criados com IA"
    },
    {
      icon: <Users className="w-8 h-8 text-blue-500" />,
      title: "Usuários Ativos",
      value: "856",
      description: "Atletas em treinamento"
    },
    {
      icon: <Target className="w-8 h-8 text-green-500" />,
      title: "Taxa de Sucesso",
      value: "94%",
      description: "Objetivos alcançados"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-purple-500" />,
      title: "Progressão Média",
      value: "23%",
      description: "Melhora em 12 semanas"
    }
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
              Fit<span className="text-orange-500">Evolution</span> AI
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/app-dashboard')}
            >
              Dashboard
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/profile')}
            >
              Perfil
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">
            Plataforma de IA para Treinos
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Sistema completo de geração automatizada de planos de treino personalizados com base em evidências científicas, 
            adaptação contínua e integração com nutrição e recuperação.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {platformStats.map((stat, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
                <div className="flex justify-center mb-3">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <div className="text-lg font-semibold mb-1">{stat.title}</div>
                <div className="text-sm opacity-90">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="generator" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto mb-8">
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Gerador IA
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Banco de Exercícios
            </TabsTrigger>
            <TabsTrigger value="progression" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Motor de Progressão
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generator">
            <TrainingPlanGenerator />
          </TabsContent>
          
          <TabsContent value="database">
            <ExerciseDatabase />
          </TabsContent>
          
          <TabsContent value="progression">
            <ProgressionEngine />
          </TabsContent>
        </Tabs>
      </div>

      {/* Technology Features */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Tecnologia Avançada</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Brain className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <CardTitle>Análise Inteligente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Algoritmos avançados analisam seu perfil, objetivos e limitações para criar 
                  planos 100% personalizados baseados em evidências científicas.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <TrendingUp className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <CardTitle>Adaptação Contínua</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Sistema de progressão automática que ajusta cargas, volumes e intensidades 
                  com base no seu feedback e performance em tempo real.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Target className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <CardTitle>Múltiplos Formatos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Exporte seus treinos em JSON, PDF ou integre com apps de saúde. 
                  Compatível com Google Fit, Apple Health e principais plataformas.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2024 FitEvolution AI. Todos os direitos reservados. 
            Plataforma de IA para geração automatizada de treinos personalizados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AITrainingPlatform;
