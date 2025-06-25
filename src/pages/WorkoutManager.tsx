
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PDFUpload } from "@/components/workout/PDFUpload";
import { WorkoutAdminPanel } from "@/components/workout/WorkoutAdminPanel";
import { WorkoutDisplay } from "@/components/workout/WorkoutDisplay";
import { exportWorkoutToPDF } from "@/utils/pdfExport";

const WorkoutManager = () => {
  const [sampleWorkout] = useState({
    segunda: {
      grupo: "Peito e Tríceps",
      exercicios: [
        {
          nome: "Supino Reto",
          series: 4,
          reps: "8-10",
          descanso: "90s",
          observacoes: "Manter controle na descida"
        },
        {
          nome: "Supino Inclinado",
          series: 3,
          reps: "10-12",
          descanso: "75s"
        },
        {
          nome: "Tríceps Testa",
          series: 3,
          reps: "12-15",
          descanso: "60s"
        }
      ]
    },
    terca: {
      grupo: "Costas e Bíceps",
      exercicios: [
        {
          nome: "Puxada Frontal",
          series: 4,
          reps: "8-10",
          descanso: "90s"
        },
        {
          nome: "Remada Curvada",
          series: 3,
          reps: "10-12",
          descanso: "75s"
        }
      ]
    }
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
