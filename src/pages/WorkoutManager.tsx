
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExerciseDatabase } from "@/components/training/ExerciseDatabase";
import { TrainingPlanGenerator } from "@/components/training/TrainingPlanGenerator";
import { VideoManager } from "@/components/training/VideoManager";
import { WorkoutAdminPanel } from "@/components/workout/WorkoutAdminPanel";
import { StudentsManagement } from "@/components/students/StudentsManagement";

const WorkoutManager = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Sistema de Gestão de Treinos - Rony Trainer
        </h1>
        
        <Tabs defaultValue="exercises" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="exercises">Biblioteca</TabsTrigger>
            <TabsTrigger value="videos">Vídeos</TabsTrigger>
            <TabsTrigger value="create">Criar Treino</TabsTrigger>
            <TabsTrigger value="students">Alunos</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>
          
          <TabsContent value="exercises">
            <ExerciseDatabase />
          </TabsContent>
          
          <TabsContent value="videos">
            <VideoManager />
          </TabsContent>
          
          <TabsContent value="create">
            <TrainingPlanGenerator />
          </TabsContent>
          
          <TabsContent value="students">
            <StudentsManagement />
          </TabsContent>
          
          <TabsContent value="admin">
            <WorkoutAdminPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WorkoutManager;
