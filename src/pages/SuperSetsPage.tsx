import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Zap } from 'lucide-react';

export default function SuperSetsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const superSets = [
    {
      id: 1,
      name: 'Bi-set Costas',
      difficulty: 'Básico',
      exercises: '2 exercícios',
      color: 'bg-green-500'
    },
    {
      id: 2,
      name: 'Bi-set Supino',
      difficulty: 'Intermediário',
      exercises: '2 exercícios',
      color: 'bg-yellow-500'
    },
    {
      id: 3,
      name: 'Circuito de exercícios',
      difficulty: 'Avançado',
      exercises: '5 exercícios',
      color: 'bg-red-500'
    }
  ];

  const filteredSuperSets = superSets.filter(superSet =>
    superSet.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Super séries</h1>
        <Button className="bg-green-500 hover:bg-green-600">
          <Plus className="w-4 h-4 mr-2" />
          Nova super série
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-blue-800">
              A super série é um circuito com dois ou mais exercícios que pode ser utilizado na montagem de uma série para seu aluno.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
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

      {/* Super Sets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuperSets.map((superSet) => (
          <Card key={superSet.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-4 h-20 ${superSet.color} rounded`}></div>
                <div className="flex-1 ml-4">
                  <h3 className="font-semibold text-lg mb-2">{superSet.name}</h3>
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-xs">
                      {superSet.difficulty}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{superSet.exercises}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Editar
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Ver detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSuperSets.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma super série encontrada</h3>
              <p className="text-muted-foreground">Tente ajustar a pesquisa ou crie uma nova super série.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}