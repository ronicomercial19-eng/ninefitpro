import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function StudentSubscriptionList() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, plan_status");
      
      if (!error && data) {
        setStudents(data);
      }
      setLoading(false);
    }
    fetchStudents();
  }, []);

  const activeCount = students.filter(s => s.plan_status === 'pro' || s.plan_status === 'active').length;
  const expiredCount = students.length - activeCount;

  if (loading) return <div>Carregando alunos...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Assinaturas Ativas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{activeCount}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Expiradas/Sem Plano</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{expiredCount}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Assinaturas dos Alunos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const isActive = student.plan_status === 'pro' || student.plan_status === 'active';
                return (
                  <TableRow key={student.email}>
                    <TableCell>{student.full_name || 'N/A'}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {isActive ? 'Ativo' : 'Expirado/Pendente'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
