
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Search, Eye, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { StudentDetailedView } from "./StudentDetailedView";
import { listAthletesByCoach, updateAthlete } from '@/services/athletes.service';
import { supabase } from '@/integrations/supabase/client';

interface Student {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  primary_goal?: string | null;
  experience_level?: string | null;
  birthdate?: string | null;
  peso_kg?: number | null;
  altura_cm?: number | null;
  injuries_limitations?: string | null;
  activated: boolean | null;
  created_at: string;
}

export function StudentsList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  useEffect(() => { fetchStudents(); }, []);
  useEffect(() => { filterStudents(); }, [students, searchTerm]);

  const fetchStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Você precisa estar logado'); return; }

      const result = await listAthletesByCoach(user.id);
      if (!result.success) throw new Error(result.error?.message);
      setStudents(result.data ?? []);
    } catch (error: any) {
      console.error('Erro ao buscar alunos:', error);
      toast.error('Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    if (!searchTerm) { setFilteredStudents(students); return; }
    setFilteredStudents(students.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.primary_goal || '').toLowerCase().includes(searchTerm.toLowerCase())
    ));
  };

  const toggleStudentStatus = async (studentId: string, currentStatus: boolean | null) => {
    try {
      const result = await updateAthlete(studentId, { activated: !currentStatus });
      if (!result.success) throw new Error(result.error?.message);
      setStudents(students.map(s => s.id === studentId ? { ...s, activated: !currentStatus } : s));
      toast.success(`Aluno ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do aluno');
    }
  };

  const getObjectiveBadge = (objetivo: string | null | undefined) => {
    const colors: Record<string, string> = {
      'emagrecimento': 'bg-red-100 text-red-800',
      'hipertrofia': 'bg-blue-100 text-blue-800',
      'forca': 'bg-green-100 text-green-800',
      'condicionamento': 'bg-yellow-100 text-yellow-800',
      'reabilitacao': 'bg-purple-100 text-purple-800',
      'performance': 'bg-orange-100 text-orange-800'
    };
    return <Badge className={colors[objetivo || ''] || 'bg-gray-100 text-gray-800'}>{objetivo || 'N/A'}</Badge>;
  };

  const calculateAge = (birthDate: string | null | undefined) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Carregando alunos...</span>
      </div>
    );
  }

  if (viewMode === 'detail' && selectedStudent) {
    return (
      <StudentDetailedView
        student={selectedStudent}
        onBack={() => { setViewMode('list'); setSelectedStudent(null); }}
        onStudentUpdated={(updated) => {
          setStudents(students.map(s => s.id === updated.id ? { ...s, ...updated } : s));
          setSelectedStudent({ ...selectedStudent, ...updated });
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Lista de Alunos</h2>
          <Badge variant="secondary">{students.length} alunos</Badge>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar aluno..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Alunos Cadastrados</CardTitle></CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{searchTerm ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}</p>
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
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email || 'N/A'}</TableCell>
                    <TableCell>{getObjectiveBadge(student.primary_goal)}</TableCell>
                    <TableCell><Badge variant="outline">{student.experience_level || 'Não informado'}</Badge></TableCell>
                    <TableCell>{calculateAge(student.birthdate) ? `${calculateAge(student.birthdate)} anos` : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={student.activated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {student.activated ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { window.location.href = `/area-do-aluno?id=${student.id}`; }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant={student.activated ? "destructive" : "default"} onClick={() => toggleStudentStatus(student.id, student.activated)}>
                          {student.activated ? <Trash2 className="w-4 h-4" /> : 'Ativar'}
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
    </div>
  );
}
