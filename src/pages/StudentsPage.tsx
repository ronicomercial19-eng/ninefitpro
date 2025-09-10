import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, UserPlus } from 'lucide-react';

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  const students = [
    { id: 1, name: 'Nelson angélico', email: 'nelson.angelico@outlook.com', initials: 'NA', status: 'active' },
    { id: 2, name: 'Ana Beatriz (exemplo)', email: 'ana51168@mobitrainer.com.br', initials: 'AB', status: 'blocked', hasPayment: true },
    { id: 3, name: 'Beatriz Prado', email: 'beatriz.prado1717@gmail.com', initials: 'BP', status: 'active' },
    { id: 4, name: 'Bruno Nuldman', email: 'bruno@420011@gmail.com', initials: 'BN', status: 'active' },
    { id: 5, name: 'carolina 123', email: 'carolinaoleto2olive@gmail.com', initials: 'C1', status: 'active' },  
    { id: 6, name: 'Carol Simaes', email: 'csaury@voxus.com.br', initials: 'CS', status: 'active' },
    { id: 7, name: 'Denise Costa', email: 'denisecostmail.com.br', initials: 'DC', status: 'active' },
    { id: 8, name: 'Denise Rem', email: 'denise.rem@gmail.com', initials: 'DR', status: 'active' },
    { id: 9, name: 'Fabiana Oliveira', email: 'dru.faebimplacavioleta@g.br', initials: 'FO', status: 'active' },
    { id: 10, name: 'Flávio Feio', email: 'flavioefepverde@gmail.com', initials: 'FF', status: 'active' },
    { id: 11, name: 'Flávio Lima', email: 'flaolima5@gmail.com', initials: 'FL', status: 'active' },
    { id: 12, name: 'fernanda tafner', email: 'fernandatafner1@outlook.com', initials: 'FT', status: 'active' },
    { id: 13, name: 'Giovanna Prodomo', email: 'gilvadomo@gmail.com', initials: 'GP', status: 'active' },
    { id: 14, name: 'gui 125', email: 'guimaraes126@gmail.com', initials: 'G1', status: 'active' },
    { id: 15, name: 'leda lshi', email: 'iedaeglcr@iofani.br', initials: 'LL', status: 'active' },
    { id: 16, name: 'Isac Nuldeman', email: 'isac.nudeman@gmail.com', initials: 'IN', status: 'active' },
    { id: 17, name: 'Jade Guerra', email: 'jadeguerra@gmail.com', initials: 'JG', status: 'active' },
    { id: 18, name: 'José Bruno', email: 'josebruno5@gmail.com', initials: 'JB', status: 'active' }
  ];

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'blocked') return matchesSearch && student.status === 'blocked';
    if (filter === 'active') return matchesSearch && student.status === 'active';
    
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Alunos</h1>
        <Button className="bg-green-500 hover:bg-green-600">
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

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {filteredStudents.map((student) => (
          <Card key={student.id} className="relative">
            <CardContent className="p-4">
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold">{student.initials}</span>
                  </div>
                  {student.status === 'blocked' && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">!</span>
                    </div>
                  )}
                </div>
                
                <div className="text-center space-y-1">
                  <h3 className="font-medium text-sm text-foreground">{student.name}</h3>
                  <p className="text-xs text-muted-foreground break-all">{student.email}</p>
                </div>

                {student.hasPayment && (
                  <Badge variant="destructive" className="text-xs">
                    Inadimplente
                  </Badge>
                )}

                <div className="flex space-x-2 w-full">
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    Ver
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum aluno encontrado</h3>
              <p className="text-muted-foreground">Tente ajustar os filtros ou adicione um novo aluno.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}