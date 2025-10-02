import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, FileText, Columns } from 'lucide-react';

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const studentsData = [
    {
      id: 1,
      name: 'Ana Beatriz (exemplo)',
      email: 'ana51168@fitevolution.com.br',
      phone: '',
      planExpiry: 'Não preenchido',
      trainer: 'Rony Trainer',
      trainingExpiry: 'Não preenchido',
      daysWithoutBooking: '1471'
    },
    {
      id: 2,
      name: 'Luiz Busmann',
      email: 'leduardopiccolo@terra.com',
      phone: '11961962656',
      planExpiry: 'Não preenchido',
      trainer: 'Rony Trainer',
      trainingExpiry: 'Não preenchido',
      daysWithoutBooking: '1471'
    },
    {
      id: 3,
      name: 'Julia Tafner',
      email: 'juliatafner@hotmail.com',
      phone: '(11) 5680-03401',
      planExpiry: 'Não preenchido',
      trainer: 'Rony Trainer',
      trainingExpiry: 'Não preenchido',
      daysWithoutBooking: '1588'
    },
    {
      id: 4,
      name: 'Sophia Costa',
      email: 'sophia_costaramalho@hotmail.com',
      phone: '(11) 9554-06868',
      planExpiry: 'Não preenchido',
      trainer: 'Rony Trainer',
      trainingExpiry: '25/02/2021',
      daysWithoutBooking: '1668'
    },
    {
      id: 5,
      name: 'Giovanna Prodomo',
      email: 'gilvadomo@gmail.com',
      phone: '(11) 9561-33626',
      planExpiry: 'Não preenchido',
      trainer: 'Rony Trainer',
      trainingExpiry: 'Não preenchido',
      daysWithoutBooking: ''
    },
    {
      id: 6,
      name: 'Raphael Soares',
      email: 'raphael.soares@me.com',
      phone: '11963244962',
      planExpiry: 'Não preenchido',
      trainer: 'Rony Trainer',
      trainingExpiry: 'Não preenchido',
      daysWithoutBooking: ''
    },
    {
      id: 7,
      name: 'Raquel Miron',
      email: 'raquel@lmca.com.br',
      phone: '(11) 5527-66668',
      planExpiry: 'Não preenchido',
      trainer: 'Rony Trainer',
      trainingExpiry: 'Não preenchido',
      daysWithoutBooking: ''
    },
    {
      id: 8,
      name: 'Rafaela Ribas',
      email: 'rafaelaribascouto@gmail.com',
      phone: '11984330355',
      planExpiry: 'Não preenchido',
      trainer: 'Rony Trainer',
      trainingExpiry: 'Não preenchido',
      daysWithoutBooking: '1253'
    },
    {
      id: 9,
      name: 'Roberto Evangelista',
      email: 'roberto.evangelista@engenhemor.com.br',
      phone: '(11) 9415-66347',
      planExpiry: 'Não preenchido',
      trainer: 'Rony Trainer',
      trainingExpiry: 'Não preenchido',
      daysWithoutBooking: ''
    },
    {
      id: 10,
      name: 'Beatriz Prado',
      email: 'beatriz.prado1717@gmail.com',
      phone: '11584736429',
      planExpiry: 'Não preenchido',
      trainer: 'Rony Trainer',
      trainingExpiry: 'Não preenchido',
      daysWithoutBooking: '1262'
    },
    {
      id: 11,
      name: 'leda Ishi',
      email: 'iedaishi@uol.com.br',
      phone: '11959236001',
      planExpiry: 'Não preenchido',
      trainer: 'Rony Trainer',
      trainingExpiry: 'Não preenchido',
      daysWithoutBooking: ''
    },
    {
      id: 12,
      name: 'Isac Nuldeman',
      email: 'isac.nudeman@gmail.com',
      phone: '(11) 9595-19608',
      planExpiry: 'Não preenchido',
      trainer: 'Rony Trainer',
      trainingExpiry: 'Não preenchido',
      daysWithoutBooking: ''
    },
    {
      id: 13,
      name: 'Pault Lopez',
      email: 'paultilopez@gmail.com',
      phone: '(11) 95250-16100',
      planExpiry: 'Não preenchido',
      trainer: 'Rony Trainer',
      trainingExpiry: 'Não preenchido',
      daysWithoutBooking: '1183'
    }
  ];

  const filteredData = studentsData.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
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