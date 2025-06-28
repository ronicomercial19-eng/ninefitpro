
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Crown, Play, Users, Target, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-black/90 backdrop-blur-lg border-b border-gray-800 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-white cursor-pointer" onClick={() => navigate('/')}>
            Fit<span className="text-orange-500">Evolution</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => navigate('/sales')} className="text-gray-300 hover:text-orange-500 transition-colors">
              Planos
            </button>
            <button onClick={() => navigate('/workout-manager')} className="text-gray-300 hover:text-orange-500 transition-colors">
              Treinos
            </button>
            <button onClick={() => navigate('/assessment')} className="text-gray-300 hover:text-orange-500 transition-colors">
              Avaliação
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => navigate('/login')} 
              variant="outline" 
              className="border-gray-600 text-white hover:bg-white hover:text-black"
            >
              Entrar
            </Button>
            <Button 
              onClick={() => navigate('/register')} 
              className="bg-orange-500 hover:bg-orange-600 text-black font-medium"
            >
              Começar
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black to-gray-900"></div>
        
        <div className="container mx-auto max-w-6xl text-center relative z-20">
          <Badge className="mb-6 bg-orange-500/10 text-orange-500 border-orange-500/20 px-6 py-2">
            <Crown className="w-4 h-4 mr-2" />
            Menos é Mais. O Essencial Energiza.
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Evolução<br />
            <span className="text-orange-500">Minimalista</span><br />
            Resultados Máximos
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Tecnologia profissional, design elegante e foco absoluto nos seus resultados. 
            A transformação acontece quando eliminamos o desnecessário.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="bg-orange-500 hover:bg-orange-600 text-black px-8 py-4 text-lg font-medium"
            >
              Iniciar Transformação
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/sales')}
              className="border-2 border-gray-600 text-white hover:bg-white hover:text-black px-8 py-4 text-lg"
            >
              Ver Demo
              <Play className="ml-2 w-5 h-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">+5k</div>
              <div className="text-gray-300">Transformações</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">95%</div>
              <div className="text-gray-300">Taxa de Sucesso</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">30 dias</div>
              <div className="text-gray-300">Primeiros Resultados</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-20 bg-white text-black">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="w-4 h-4 bg-orange-500 mx-auto mb-4"></div>
            <h2 className="text-4xl font-bold text-black mb-4">
              Por que <span className="text-orange-500">FitEvolution</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Minimalismo que energiza. Cada elemento tem um propósito claro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Foco Absoluto</h3>
              <p className="text-gray-600">Apenas o essencial para sua evolução</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Energia Constante</h3>
              <p className="text-gray-600">Programas que se adaptam ao seu ritmo</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Suporte Humano</h3>
              <p className="text-gray-600">Acompanhamento real quando precisar</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg" 
              onClick={() => navigate('/sales')}
              className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg font-medium"
            >
              Conhecer Todos os Recursos
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black text-white">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-8 h-8 bg-orange-500 mx-auto mb-6"></div>
            <h2 className="text-4xl font-bold mb-4">
              Sua Evolução<br />
              <span className="text-orange-500">Começa Agora</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Elimine o desnecessário. Foque no essencial. Transforme-se.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/register')}
                className="bg-orange-500 hover:bg-orange-600 text-black px-8 py-4 text-lg font-medium"
              >
                Começar Transformação
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold mb-4">
                Fit<span className="text-orange-500">Evolution</span>
              </div>
              <p className="text-gray-400 mb-4">
                Onde a forma encontra a função, e o minimalismo energiza.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Aplicativo</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => navigate('/dashboard')} className="hover:text-orange-500">Dashboard</button></li>
                <li><button onClick={() => navigate('/workout-manager')} className="hover:text-orange-500">Treinos</button></li>
                <li><button onClick={() => navigate('/assessment')} className="hover:text-orange-500">Avaliação</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Conta</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => navigate('/login')} className="hover:text-orange-500">Entrar</button></li>
                <li><button onClick={() => navigate('/register')} className="hover:text-orange-500">Registrar</button></li>
                <li><button onClick={() => navigate('/pricing')} className="hover:text-orange-500">Planos</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Princípios</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Menos é Mais</li>
                <li>Clareza de Propósito</li>
                <li>Energia Constante</li>
                <li>Evolução Contínua</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 FitEvolution. Menos é mais. O essencial energiza.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
