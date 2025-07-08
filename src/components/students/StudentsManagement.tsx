
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AdicionarAlunoForm } from "./AdicionarAlunoForm";
import { StudentsList } from "./StudentsList";

export function StudentsManagement() {
  const [showAddForm, setShowAddForm] = useState(false);

  const handleStudentAdded = () => {
    setShowAddForm(false);
    // The StudentsList component will automatically refresh
  };

  if (showAddForm) {
    return (
      <div className="space-y-6">
        <AdicionarAlunoForm 
          onStudentAdded={handleStudentAdded}
          onCancel={() => setShowAddForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerenciar Alunos</h1>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Aluno
        </Button>
      </div>
      
      <StudentsList />
    </div>
  );
}
