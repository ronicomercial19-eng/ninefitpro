
import { Card } from "@/components/ui/card";

export const MethodSection = () => {
  return (
    <section id="method" className="py-20 bg-orange-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">
              Método <span className="text-orange-500">Científico</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Nossa abordagem combina neurociência, biomecânica e análise de dados 
              para criar o plano de treino mais eficiente para você.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">1</div>
                <div>
                  <h3 className="font-semibold mb-2">Análise Inicial</h3>
                  <p className="text-muted-foreground">Avaliação completa do seu biotipo e objetivos</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">2</div>
                <div>
                  <h3 className="font-semibold mb-2">IA Personalizada</h3>
                  <p className="text-muted-foreground">Algoritmo adapta treinos baseado no seu progresso</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">3</div>
                <div>
                  <h3 className="font-semibold mb-2">Evolução Contínua</h3>
                  <p className="text-muted-foreground">Acompanhamento em tempo real e ajustes automáticos</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <Card className="p-8 bg-white dark:bg-gray-800 shadow-2xl">
              <div className="text-center">
                <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-4xl">🧠</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">95% de Eficácia</h3>
                <p className="text-muted-foreground">
                  Usuários alcançam seus objetivos 3x mais rápido 
                  com nosso método científico
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
