import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchBatchedRows } from "@/lib/batchedRows";
import { withTimeout } from "@/lib/withTimeout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdicionarAlunoForm } from "@/components/students/AdicionarAlunoForm";
import { StudentDetailedView } from "@/components/students/StudentDetailedView";

interface Student {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  objetivo: string;
  nivel_experiencia?: string;
  peso_kg?: number;
  altura_cm?: number;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  foto_url?: string;
  status_pagamento?: string;
  data_nascimento?: string;
  profissao?: string;
  endereco_completo?: string;
  data_vencimento_plano?: string;
  forma_pagamento?: string;
  valor_mensalidade?: number;
}

export default function StudentsPage() {
  const workspace = useProfessorWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [debouncedSearch,setDebouncedSearch]=useState("");
  useEffect(()=>{const timer=setTimeout(()=>setDebouncedSearch(searchTerm),300);return()=>clearTimeout(timer);},[searchTerm]);
  const [showAddForm, setShowAddForm] = useState(false);

  const rosterPage=useQuery({
    queryKey:["professor-student-page",user?.id,page,debouncedSearch,filter],
    enabled:!!user && !workspace.error,
    staleTime:60_000,
    queryFn:async({signal})=>{
      const {data,error}=await withTimeout(supabase.rpc("fn_coach_students_page" as any,{p_offset:page*50,p_limit:50,p_search:debouncedSearch,p_filter:filter} as any).abortSignal(signal));
      if(error)throw error;
      const result=data as unknown as {students:{id:string}[];total:number};
      if(!Array.isArray(result?.students)||!Number.isSafeInteger(result.total))throw Error("Lista de alunos inválida");
      return result;
    },
  });
  const pageIds = rosterPage.data?.students.map(row=>row.id) ?? [];
  const athleteIds = [...new Set([...pageIds,...(workspace.athleteId?[workspace.athleteId]:[])])];
  const studentQueryKey = ["professor-student-details", user?.id, athleteIds];
  const studentsQuery = useQuery({
    queryKey: studentQueryKey,
    enabled: !!user && rosterPage.isSuccess && !workspace.error,
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<Student[]> => {
      const athletesData = await fetchBatchedRows(athleteIds, async ids => {
        const { data, error } = await withTimeout(supabase
        .from("athletes")
        .select("id,name,email,metadata,phone,primary_goal,objetivo,experience_level,nivel,peso_kg,altura_cm,injuries_limitations,activated,created_at,birthdate")
        .in("id", ids)
        .abortSignal(signal));
        if (error) throw error;
        return data ?? [];
      }, signal);

      // Mapear dados dos athletes para o formato de Student
      const mappedStudents: Student[] = (athletesData || []).map((athlete) => {
        // Extract email from: 1) email column, 2) metadata.email, 3) fallback empty
        const athleteEmail =
          athlete.email ||
          (typeof (athlete.metadata as { email?: unknown } | null)?.email === "string" ? (athlete.metadata as {email:string}).email : "") ||
          "";

        return {
          id: athlete.id,
          nome: athlete.name,
          email: athleteEmail,
          telefone: athlete.phone || undefined,
          objetivo: athlete.primary_goal || athlete.objetivo || "",
          nivel_experiencia:
            athlete.experience_level || athlete.nivel || undefined,
          peso_kg: athlete.peso_kg || undefined,
          altura_cm: athlete.altura_cm || undefined,
          observacoes: athlete.injuries_limitations || undefined,
          ativo: athlete.activated || false,
          created_at: athlete.created_at,
          foto_url: undefined,
          status_pagamento: undefined,
          data_nascimento: athlete.birthdate || undefined,
        };
      });

      return mappedStudents.sort((a, b) => athleteIds.indexOf(a.id)-athleteIds.indexOf(b.id));
    },
  });
  const students = studentsQuery.data ?? [];
  const loading = rosterPage.isPending || studentsQuery.isLoading || searchTerm!==debouncedSearch;
  const hasError = workspace.error || rosterPage.isError || studentsQuery.isError;

  const selectedStudent = students.find(s => s.id === workspace.athleteId) ?? null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => { setPage(0); }, [searchTerm, filter, user?.id]);
  const totalStudents=rosterPage.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalStudents / 50));
  useEffect(()=>{if(rosterPage.data&&page>=pageCount)setPage(pageCount-1);},[rosterPage.data,page,pageCount]);
  const currentPage = Math.min(page, pageCount - 1);
  const visibleStudents = students.filter(student=>pageIds.includes(student.id));

  const handleStudentAdded = () => {
    setShowAddForm(false);
    void queryClient.invalidateQueries({ queryKey: ["professor-students", user?.id] });
    void queryClient.invalidateQueries({ queryKey: ["professor-student-details", user?.id] });
    void queryClient.invalidateQueries({ queryKey: ["professor-student-page", user?.id] });
    toast.success("Aluno adicionado com sucesso!");
  };

  const handleViewStudent = (student: Student) => {
    workspace.select(student.id);
  };

  const handleEditStudent = (student: Student) => {
    // Go to detailed view for editing
    workspace.select(student.id);
  };

  const handleBackToList = () => {
    workspace.select(null);
  };

  const handleStudentUpdated = (updatedStudent: Student) => {
    queryClient.setQueryData<Student[]>(studentQueryKey, previous =>
      previous?.map(student => student.id === updatedStudent.id ? updatedStudent : student));
    void queryClient.invalidateQueries({queryKey:["professor-student-page",user?.id]});
    void queryClient.invalidateQueries({queryKey:["professor-students",user?.id]});
  };

  // Show student detailed view
  if (selectedStudent) {
    return (
      <StudentDetailedView
        key={selectedStudent.id}
        student={selectedStudent}
        onBack={handleBackToList}
        onStudentUpdated={handleStudentUpdated}
      />
    );
  }

  // Show add form
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
        <h1 className="text-3xl font-bold text-foreground">Alunos</h1>
        <Button
          className="bg-green-500 hover:bg-green-600"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo aluno
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Bloqueados/desbloqueados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mostrar todos</SelectItem>
                  <SelectItem value="blocked">Bloqueados</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {hasError && (
        <Card><CardContent className="py-6" role="alert">
          <p>Não foi possível carregar a lista completa de alunos.</p>
          <Button variant="outline" onClick={() => { workspace.retry(); void rosterPage.refetch(); void studentsQuery.refetch(); }}>Tentar novamente</Button>
        </CardContent></Card>
      )}

      {!loading && !hasError && totalStudents > 0 && (
        <nav aria-label="Páginas de alunos" className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{totalStudents} alunos · página {currentPage + 1} de {pageCount}</span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</Button>
            <Button variant="outline" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Próxima</Button>
          </div>
        </nav>
      )}
      {/* Bound mounted cards while preserving search across the whole roster. */}
      {!loading && !hasError && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {visibleStudents.map((student) => (
            <Card key={student.id} className="relative">
              <CardContent className="p-4">
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                      {student.foto_url ? (
                        <img
                          src={student.foto_url}
                          alt={student.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold">
                          {getInitials(student.nome)}
                        </span>
                      )}
                    </div>
                    {!student.ativo && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">!</span>
                      </div>
                    )}
                  </div>

                  <div className="text-center space-y-1">
                    <h3 className="font-medium text-sm text-foreground">
                      {student.nome}
                    </h3>
                    <p className="text-xs text-muted-foreground break-all">
                      {student.email}
                    </p>
                  </div>

                  {student.status_pagamento === "atrasado" && (
                    <Badge variant="destructive" className="text-xs">
                      Inadimplente
                    </Badge>
                  )}

                  <div className="flex space-x-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleEditStudent(student)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleViewStudent(student)}
                    >
                      Ver
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && !hasError && totalStudents === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum aluno encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Tente ajustar os filtros ou adicione um novo aluno.
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar primeiro aluno
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
