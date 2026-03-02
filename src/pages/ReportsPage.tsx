import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Search, FileText, Plus, Users, CheckCircle } from 'lucide-react';
import { ReportGenerator } from '@/components/reports/ReportGenerator';
import { CheckInReport } from '@/components/reports/CheckInReport';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface StudentReport {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  objetivo: string | null;
  created_at: string;
}

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [studentsData, setStudentsData] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('athletes')
      .select('id, name, email, phone, objetivo, created_at')
      .order('name');

    if (data) {
      setStudentsData(data);
    }
    if (error) console.error('Error fetching students:', error);
    setLoading(false);
  };

  if (showReportGenerator) {
    return (
      <div className="max-w-2xl mx-auto">
        <ReportGenerator onClose={() => setShowReportGenerator(false)} />
      </div>
    );
  }

  const filteredData = studentsData.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
        <Button 
          className="bg-primary hover:bg-primary/90"
          onClick={() => setShowReportGenerator(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Gerar Relatório
        </Button>
      </div>

      <Tabs defaultValue="alunos" className="w-full">
        <TabsList>
          <TabsTrigger value="alunos" className="gap-2">
            <Users className="w-4 h-4" />
            Alunos
          </TabsTrigger>
          <TabsTrigger value="presenca" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Presença / Check-ins
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alunos" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Todos os alunos</h2>
                  <p className="text-sm text-muted-foreground">Encontrado {filteredData.length} itens</p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  IMPRIMIR
                </Button>
              </div>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Objetivo</TableHead>
                        <TableHead>Cadastro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell className="text-primary underline">{student.email || '-'}</TableCell>
                          <TableCell>{student.phone || '-'}</TableCell>
                          <TableCell>
                            {student.objetivo ? (
                              <Badge variant="secondary">{student.objetivo}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{new Date(student.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {!loading && filteredData.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-muted-foreground">Tente ajustar os termos da pesquisa.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="presenca" className="mt-4">
          <CheckInReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
