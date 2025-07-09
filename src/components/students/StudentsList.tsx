
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Eye, Edit, Trash2, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Student {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  objetivo: string;
  nivel_experiencia?: string;
  data_nascimento?: string;
  peso_kg?: number;
  altura_cm?: number;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
}

export function StudentsList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm]);

  const fetchStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Você precisa estar logado');
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('professor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStudents(data || []);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      toast.error('Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    if (!searchTerm) {
      setFilteredStudents(students);
      return;
    }

    const filtered = students.filter(student =>
      student.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.objetivo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredStudents(filtered);
  };

  const toggleStudentStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ ativo: !currentStatus })
        .eq('id', studentId);

      if (error) throw error;

      setStudents(students.map(student =>
        student.id === studentId
          ? { ...student, ativo: !currentStatus }
          : student
      ));

      toast.success(`Aluno ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do aluno');
    }
  };

  const getObjectiveBadge = (objetivo: string) => {
    const colors: { [key: string]: string } = {
      'emagrecimento': 'bg-red-100 text-red-800',
      'hipertrofia': 'bg-blue-100 text-blue-800',
      'forca': 'bg-green-100 text-green-800',
      'condicionamento': 'bg-yellow-100 text-yellow-800',
      'reabilitacao': 'bg-purple-100 text-purple-800',
      'performance': 'bg-orange-100 text-orange-800'
    };

    return (
      <Badge className={colors[objetivo] || 'bg-gray-100 text-gray-800'}>
        {objetivo}
      </Badge>
    );
  };

  const calculateAge = (birthDate: string | undefined) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3">Carregando alunos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header e Busca */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Lista de Alunos</h2>
          <Badge variant="secondary">{students.length} alunos</Badge>
        </div>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar aluno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabela de Alunos */}
      <Card>
        <CardHeader>
          <CardTitle>Alunos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'Nenhum aluno encontrado com esses critérios' : 'Nenhum aluno cadastrado ainda'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.nome}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{getObjectiveBadge(student.objetivo)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {student.nivel_experiencia || 'Não informado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {calculateAge(student.data_nascimento) 
                        ? `${calculateAge(student.data_nascimento)} anos`
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={student.ativo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                        }
                      >
                        {student.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={student.ativo ? "destructive" : "default"}
                          onClick={() => toggleStudentStatus(student.id, student.ativo)}
                        >
                          {student.ativo ? <Trash2 className="w-4 h-4" /> : 'Ativar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Aluno */}
      {selectedStudent && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Detalhes - {selectedStudent.nome}</CardTitle>
              <Button
                variant="outline"
                onClick={() => setSelectedStudent(null)}
              >
                Fechar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Informações Pessoais</h4>
                <div className="space-y-2">
                  <p><strong>Nome:</strong> {selectedStudent.nome}</p>
                  <p><strong>Email:</strong> {selectedStudent.email}</p>
                  {selectedStudent.telefone && (
                    <p><strong>Telefone:</strong> {selectedStudent.telefone}</p>
                  )}
                  {selectedStudent.data_nascimento && (
                    <p><strong>Idade:</strong> {calculateAge(selectedStudent.data_nascimento)} anos</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold">Informações de Treino</h4>
                <div className="space-y-2">
                  <p><strong>Objetivo:</strong> {selectedStudent.objetivo}</p>
                  <p><strong>Nível:</strong> {selectedStudent.nivel_experiencia || 'Não informado'}</p>
                  {selectedStudent.peso_kg && (
                    <p><strong>Peso:</strong> {selectedStudent.peso_kg} kg</p>
                  )}
                  {selectedStudent.altura_cm && (
                    <p><strong>Altura:</strong> {selectedStudent.altura_cm} cm</p>
                  )}
                </div>
              </div>
            </div>
            
            {selectedStudent.observacoes && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Observações</h4>
                <p className="text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedStudent.observacoes}
                </p>
              </div>
            )}
            
            <div className="mt-6 flex gap-2">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Calendar className="w-4 h-4 mr-2" />
                Ver Treinos
              </Button>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
