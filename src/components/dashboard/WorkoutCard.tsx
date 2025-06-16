
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Target } from "lucide-react";

export const WorkoutCard = () => {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Próximo Treino</h3>
        <span className="text-sm text-orange-500 font-medium">Hoje</span>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Treino de Peito e Tríceps</h4>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              45 min
            </div>
            <div className="flex items-center">
              <Target className="w-4 h-4 mr-1" />
              8 exercícios
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <p className="text-sm font-medium mb-2">Exercícios principais:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Supino reto - 4x8-10</li>
            <li>• Supino inclinado - 3x10-12</li>
            <li>• Tríceps testa - 3x12-15</li>
          </ul>
        </div>
        
        <Button className="w-full bg-orange-500 hover:bg-orange-600">
          Iniciar Treino
        </Button>
      </div>
    </Card>
  );
};
