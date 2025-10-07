import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, FileText, Columns, Plus } from 'lucide-react';
import { ReportGenerator } from '@/components/reports/ReportGenerator';

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showReportGenerator, setShowReportGenerator] = useState(false);

  if (showReportGenerator) {
    return (
      <div className="max-w-2xl mx-auto">
        <ReportGenerator onClose={() => setShowReportGenerator(false)} />
      </div>
    );
  }

  const studentsData: any[] = [];
  // Dados virão do Supabase quando integrado

  const filteredData = studentsData.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
        <Button 
          className="bg-blue-500 hover:bg-blue-600"
          onClick={() => setShowReportGenerator(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Gerar Relatório
        </Button>
      </div>

      {/* Report Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Todos os alunos</h2>
              <p className="text-sm text-muted-foreground">Encontrado 51 itens</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                IMPRIMIR
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                COLUNAS
              </Button>
            </div>
          </div>
          
          {/* Search */}
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

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Venc. plano</TableHead>
                  <TableHead>Treinador</TableHead>
                  <TableHead>Venc. treino</TableHead>
                  <TableHead>Dias sem marcar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Badge variant="secondary">Não preenchido</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-blue-600 underline">{student.email}</TableCell>
                    <TableCell>{student.phone}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Não preenchido</Badge>
                    </TableCell>
                    <TableCell>{student.trainer}</TableCell>
                    <TableCell>
                      {student.trainingExpiry === 'Não preenchido' ? (
                        <Badge variant="secondary">Não preenchido</Badge>
                      ) : (
                        student.trainingExpiry
                      )}
                    </TableCell>
                    <TableCell>{student.daysWithoutBooking}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filteredData.length === 0 && (
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
    </div>
  );
}