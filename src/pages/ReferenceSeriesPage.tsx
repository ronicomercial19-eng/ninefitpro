import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, BookOpen } from 'lucide-react';

export default function ReferenceSeriesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const referenceSeries = [
    {
      id: 1,
      name: 'Abdome/1',
      difficulty: 'Intermediário',
      exercises: '7 exercícios',
      color: 'bg-orange-500'
    },
    {
      id: 2,
      name: 'Abdome/1',
      difficulty: 'Intermediário',
      exercises: '8 exercícios',
      color: 'bg-orange-500'
    },
    {
      id: 3,
      name: 'Cardio + abs',
      difficulty: 'Intermediário',
      exercises: '15 exercícios',
      color: 'bg-orange-500'
    },
    {
      id: 4,
      name: 'CORE WORKOUT',
      difficulty: 'Avançado',
      exercises: '11 exercícios',
      color: 'bg-red-500'
    },
    {
      id: 5,
      name: 'Costas/bíceps',
      difficulty: 'Avançado',
      exercises: '10 exercícios',
      color: 'bg-red-500'
    },
    {
      id: 6,
      name: 'Drop-set pernas',
      difficulty: 'Intermediário',
      exercises: '10 exercícios',
      color: 'bg-orange-500'
    },
    {
      id: 7,
      name: 'FORÇA',
      difficulty: 'Básico',
      exercises: '7 exercícios',
      color: 'bg-green-500'
    },
    {
      id: 8,
      name: 'FORÇA',
      difficulty: 'Básico',
      exercises: '7 exercícios',
      color: 'bg-green-500'
    },
    {
      id: 9,
      name: 'FORTALECIMENTO- CAMINHADA',
      difficulty: 'Básico',
      exercises: '6 exercícios',
      color: 'bg-green-500'
    },
    {
      id: 10,
      name: 'FullBody Calistenic',
      difficulty: 'Avançado',
      exercises: '10 exercícios',
      color: 'bg-red-500'
    },
    {
      id: 11,
      name: 'HIT',
      difficulty: 'Intermediário',
      exercises: '8 exercícios',
      color: 'bg-orange-500'
    },
    {
      id: 12,
      name: 'HIT',
      difficulty: 'Intermediário',
      exercises: '8 exercícios',
      color: 'bg-orange-500'
    },
    {
      id: 13,
      name: 'HIT ACADEMIA',
      difficulty: 'Intermediário',
      exercises: '13 exercícios',
      color: 'bg-orange-500'
    },
    {
      id: 14,
      name: 'inicialização na luta',
      difficulty: 'Intermediário',
      exercises: '8 exercícios',
      color: 'bg-orange-500'
    },
    {
      id: 15,
      name: 'Legs Day - Ênfase anterior',
      difficulty: 'Avançado',
      exercises: '12 exercícios',
      color: 'bg-red-500'
    },
    {
      id: 16,
      name: 'Legs Day!',
      difficulty: 'Avançado',
      exercises: '9 exercícios',
      color: 'bg-red-500'
    },
    {
      id: 17,
      name: 'LEGS DAY!',
      difficulty: 'Avançado',
      exercises: '9 exercícios',
      color: 'bg-red-500'
    }
  ];

  const filteredSeries = referenceSeries.filter(series =>
    series.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Básico':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Intermediário':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Avançado':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Séries de referência</h1>
        <Button className="bg-green-500 hover:bg-green-600">
          <Plus className="w-4 h-4 mr-2" />
          Nova série de referência
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-blue-800">
              A série de referência pode ser utilizada na montagem de um treino para seu aluno.
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

      {/* Reference Series Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSeries.map((series) => (
          <Card key={series.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-4 h-20 ${series.color} rounded`}></div>
                <div className="flex-1 ml-4">
                  <h3 className="font-semibold text-lg mb-2">{series.name}</h3>
                  <div className="space-y-2">
                    <Badge variant="outline" className={getDifficultyColor(series.difficulty)}>
                      {series.difficulty}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{series.exercises}</p>
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

      {filteredSeries.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma série encontrada</h3>
              <p className="text-muted-foreground">Tente ajustar a pesquisa ou crie uma nova série de referência.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}