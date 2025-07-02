import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Crown, Play, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const OptimizedHeroSection = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-orange-300 to-orange-400 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className={`container mx-auto px-4 py-20 text-center relative z-10 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <div className="max-w-5xl mx-auto">
          <Badge className="mb-6 bg-orange-500/10 text-orange-500 border-orange-500/20 px-6 py-3 text-base font-medium backdrop-blur-sm">
            <Crown className="w-5 h-5 mr-2" />
            Menos é Mais. O Essencial Energiza.
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Desbloqueie Sua{" "}
            <span className="text-gradient bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Performance Máxima
            </span>
            <br />
            Com Ciência e IA
          </h1>
          
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            A primeira plataforma que combina treinos personalizados com IA, 
            periodização científica e acompanhamento em tempo real para 
            <strong className="text-orange-400"> resultados garantidos</strong>.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              onClick={() => navigate('/sales')}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <TrendingUp className="mr-2 w-5 h-5" />
              Transformar Agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/ai-training')}
              className="border-2 border-white/20 text-white hover:bg-white/10 hover:border-orange-500/50 px-8 py-4 text-lg backdrop-blur-sm transition-all duration-300"
            >
              <Play className="mr-2 w-5 h-5" />
              Ver IA em Ação
            </Button>
          </div>

          {/* Enhanced Stats with Animation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            {[
              { value: "+10k", label: "Transformações", desc: "Vidas mudadas" },
              { value: "95%", label: "Taxa de Sucesso", desc: "Resultados comprovados" },
              { value: "21 dias", label: "Primeiros Resultados", desc: "Mudanças visíveis" }
            ].map((stat, index) => (
              <div 
                key={index}
                className={`text-center transform transition-all duration-700 delay-${index * 200} ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
              >
                <div className="text-3xl md:text-4xl font-bold text-orange-500 mb-2">{stat.value}</div>
                <div className="text-lg font-semibold text-white mb-1">{stat.label}</div>
                <div className="text-sm text-gray-400">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-orange-500 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-orange-500 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
};