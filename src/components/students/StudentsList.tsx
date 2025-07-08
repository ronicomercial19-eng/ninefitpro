
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Edit, Trash2, Phone, Mail, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Student {
  id: string;
  nome: string;
  email: string;
  objetivo: string;
  telefone?: string;
  data_nascimento?: string;
  peso_kg?: number;
  altura_cm?: number;
  nivel_experiencia: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
}

export function StudentsList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar alunos:', error);
        toast.error('Erro ao carregar lista de alunos');
        return;
      }

      setStudents(data || []);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao carregar alunos');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ ativo: !currentStatus })
        .eq('id', studentId);

      if (error) {
        toast.error('Erro ao atualizar status do aluno');
        return;
      }

      toast.success('Status do aluno atualizado');
      fetchStudents();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro inesperado');
    }
  };

  const filteredStudents = students.filter(student =>
    student.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.objetivo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getObjectiveColor = (objetivo: string) => {
    const colors: { [key: string]: string } = {
      'Hipertrofia': 'bg-blue-100 text-blue-800',
      'Emagrecimento': 'bg-green-100 text-green-800',
      'Resistência': 'bg-yellow-100 text-yellow-800',
      'Força': 'bg-red-100 text-red-800',
      'Qualidade de Vida': 'bg-purple-100 text-purple-800',
      'Reabilitação': 'bg-orange-100 text-orange-800'
    };
    return colors[objetivo] || 'bg-gray-100 text-gray-800';
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600">Carregando alunos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Lista de Alunos ({students.length})</h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar alunos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Tente ajustar os termos de busca' 
                : 'Adicione seu primeiro aluno para começar'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{student.nome}</CardTitle>
                    <Badge 
                      variant={student.ativo ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {student.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <Badge className={getObjectiveColor(student.objetivo)}>
                    {student.objetivo}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="truncate">{student.email}</span>
                  </div>
                  
                  {student.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{student.telefone}</span>
                    </div>
                  )}
                  
                  {student.data_nascimento && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>{calculateAge(student.data_nascimento)} anos</span>
                    </div>
                  )}
                </div>

                {(student.peso_kg || student.altura_cm) && (
                  <div className="flex gap-4 text-sm">
                    {student.peso_kg && (
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {student.peso_kg}kg
                      </span>
                    )}
                    {student.altura_cm && (
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {student.altura_cm}cm
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {/* TODO: Implement edit */}}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  
                  <Button
                    size="sm"
                    variant={student.ativo ? "secondary" : "default"}
                    onClick={() => toggleStudentStatus(student.id, student.ativo)}
                  >
                    {student.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
