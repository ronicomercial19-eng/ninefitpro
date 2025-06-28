
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PDFUpload } from "@/components/workout/PDFUpload";
import { WorkoutAdminPanel } from "@/components/workout/WorkoutAdminPanel";
import { WorkoutDisplay } from "@/components/workout/WorkoutDisplay";
import { exportWorkoutToPDF } from "@/utils/pdfExport";
import { WorkoutPlan } from "@/types/workout";

const WorkoutManager = () => {
  const [sampleWorkout] = useState<WorkoutPlan>({
    nome: "Treino Hipertrofia A/B",
    objetivo: "Ganho de massa muscular e força",
    dias: [
      {
        dia: "Segunda-feira - Treino A",
        blocos: [
          {
            tipo: "Aquecimento",
            exercicios: [
              {
                nome: "Esteira leve",
                series: "1",
                repeticoes: "5 min"
              }
            ]
          },
          {
            tipo: "Principal",
            exercicios: [
              {
                nome: "Agachamento Livre",
                series: "4",
                repeticoes: "8-10",
                carga: "80kg",
                cadencia: "3-1-1",
                rir: "2"
              },
              {
                nome: "Leg Press 45°",
                series: "3",
                repeticoes: "12-15",
                carga: "120kg",
                rir: "1"
              }
            ]
          },
          {
            tipo: "Finalização",
            exercicios: [
              {
                nome: "Alongamento",
                series: "1",
                repeticoes: "5 min"
              }
            ]
          }
        ]
      }
    ]
  });

  const handleExportPDF = () => {
    exportWorkoutToPDF(sampleWorkout);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Sistema de Gestão de Treinos
        </h1>
        
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload PDF</TabsTrigger>
            <TabsTrigger value="admin">Painel Admin</TabsTrigger>
            <TabsTrigger value="display">Visualizar Treino</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload">
            <PDFUpload />
          </TabsContent>
          
          <TabsContent value="admin">
            <WorkoutAdminPanel />
          </TabsContent>
          
          <TabsContent value="display">
            <WorkoutDisplay 
              workout={sampleWorkout} 
              onExportPDF={handleExportPDF}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WorkoutManager;
