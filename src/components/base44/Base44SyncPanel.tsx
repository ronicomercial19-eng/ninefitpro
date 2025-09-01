import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCw, Database, Users, Dumbbell, Calendar, Utensils, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncResult {
  action: string;
  [key: string]: any;
}

interface SyncResponse {
  success: boolean;
  synced: number;
  results: SyncResult[];
  error?: string;
}

export function Base44SyncPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<{[key: string]: SyncResponse}>({});

  const syncWorkoutPrograms = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-workout-programs');
      
      if (error) throw error;
      
      setSyncResults(prev => ({ ...prev, programs: data }));
      toast.success(`Sincronizados ${data.synced} programas de treino`);
    } catch (error) {
      console.error('Error syncing workout programs:', error);
      toast.error('Erro ao sincronizar programas de treino');
    } finally {
      setIsLoading(false);
    }
  };

  const syncExercises = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-exercises');
      
      if (error) throw error;
      
      setSyncResults(prev => ({ ...prev, exercises: data }));
      toast.success(`Sincronizados ${data.synced} exercícios`);
    } catch (error) {
      console.error('Error syncing exercises:', error);
      toast.error('Erro ao sincronizar exercícios');
    } finally {
      setIsLoading(false);
    }
  };

  const syncClasses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-classes');
      
      if (error) throw error;
      
      setSyncResults(prev => ({ ...prev, classes: data }));
      toast.success(`Sincronizadas ${data.synced} aulas`);
    } catch (error) {
      console.error('Error syncing classes:', error);
      toast.error('Erro ao sincronizar aulas');
    } finally {
      setIsLoading(false);
    }
  };

  const syncAll = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        syncWorkoutPrograms(),
        syncExercises(),
        syncClasses()
      ]);
      toast.success('Sincronização completa realizada com sucesso!');
    } catch (error) {
      toast.error('Erro na sincronização completa');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSyncResults = (results: SyncResponse, title: string) => {
    if (!results) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {results.success ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            {title}
          </CardTitle>
          <CardDescription>
            {results.success 
              ? `${results.synced} itens sincronizados`
              : `Erro: ${results.error}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {results.results?.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">{result.action === 'created' ? 'Criado' : result.action === 'updated' ? 'Atualizado' : 'Erro'}</span>
                <Badge variant={result.action === 'error' ? 'destructive' : 'secondary'}>
                  {result.action}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sincronização Base44</h1>
          <p className="text-muted-foreground">
            Gerencie a sincronização com o app Base44
          </p>
        </div>
        <Button 
          onClick={syncAll}
          disabled={isLoading}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <RotateCw className="w-4 h-4 mr-2" />
          Sincronizar Tudo
        </Button>
      </div>

      <Tabs defaultValue="sync" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sync">Sincronização</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="w-5 h-5" />
                  Programas de Treino
                </CardTitle>
                <CardDescription>
                  Sincronizar programas de treino do Base44
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={syncWorkoutPrograms}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Sincronizar
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Exercícios
                </CardTitle>
                <CardDescription>
                  Sincronizar biblioteca de exercícios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={syncExercises}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Sincronizar
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Aulas
                </CardTitle>
                <CardDescription>
                  Sincronizar cronograma de aulas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={syncClasses}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Sincronizar
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Resultados da Sincronização */}
          {syncResults.programs && renderSyncResults(syncResults.programs, 'Programas de Treino')}
          {syncResults.exercises && renderSyncResults(syncResults.exercises, 'Exercícios')}
          {syncResults.classes && renderSyncResults(syncResults.classes, 'Aulas')}
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Sincronização</CardTitle>
              <CardDescription>
                Histórico das últimas sincronizações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Os logs serão exibidos aqui após as próximas atualizações.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da API</CardTitle>
              <CardDescription>
                Configurações de conexão com Base44
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded">
                <div>
                  <h4 className="font-medium">API Base44</h4>
                  <p className="text-sm text-muted-foreground">
                    Status da conexão com Base44
                  </p>
                </div>
                <Badge variant="secondary">Configurado</Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded">
                <div>
                  <h4 className="font-medium">Sincronização Automática</h4>
                  <p className="text-sm text-muted-foreground">
                    Sincronização automática a cada 24 horas
                  </p>
                </div>
                <Badge variant="outline">Em breve</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}