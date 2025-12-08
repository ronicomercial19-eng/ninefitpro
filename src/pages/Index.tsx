import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Target,
  Zap,
  Users,
  Star,
  CheckCircle,
  Play,
  TrendingUp,
  Brain,
  Smartphone,
  Heart,
  Award
} from "lucide-react";
import { OptimizedHeroSection } from "@/components/sections/OptimizedHeroSection";
import { WhatsAppFloat } from "@/components/sections/WhatsAppFloat";
import { ExitIntentPopup } from "@/components/sections/ExitIntentPopup";
import { ProgressChart } from "@/components/sections/ProgressChart";

const Index = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const testimonials = [
    {
      name: "Ana Silva",
      age: 29,
      result: "Perdi 12kg em 3 meses",
      text: "Nunca imaginei que treinar pudesse ser tão eficiente. A IA da FitEvolution criou exatamente o que eu precisava.",
      rating: 5
    },
    {
      name: "Carlos Santos",
      age: 35,
      result: "Ganhou 8kg de massa muscular",
      text: "Método científico que realmente funciona. Meus treinos são perfeitamente adaptados ao meu progresso.",
      rating: 5
    },
    {
      name: "Mariana Costa",
      age: 24,
      result: "Reduziu 15% de gordura corporal",
      text: "O acompanhamento é incrível. Sinto que tenho um personal trainer 24h comigo.",
      rating: 5
    }
  ];

  const features = [
    {
      icon: <Brain className="w-8 h-8 text-orange-500" />,
      title: "IA Personalizada",
      description: "Algoritmos avançados criam treinos únicos baseados no seu perfil e objetivos."
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-orange-500" />,
      title: "Progressão Científica",
      description: "Periodização baseada em evidências para máximos resultados em mínimo tempo."
    },
    {
      icon: <Smartphone className="w-8 h-8 text-orange-500" />,
      title: "App Nativo",
      description: "Tecnologia de ponta em iOS e Android com sincronização em tempo real."
    },
    {
      icon: <Heart className="w-8 h-8 text-orange-500" />,
      title: "Acompanhamento 24/7",
      description: "Suporte humano quando precisar, métricas inteligentes sempre."
    }
  ];

  const benefits = [
    "🎯 Treinos 100% personalizados",
    "📊 Acompanhamento em tempo real",
    "🧠 IA que aprende com seu progresso",
    "💪 Resultados garantidos em 30 dias",
    "📱 App profissional iOS/Android",
    "👨‍⚕️ Orientação médica integrada",
    "🍎 Planos nutricionais inclusos",
    "🏆 Gamificação motivacional"
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Enhanced Navigation with Scroll Effect */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrollY > 50
        ? 'bg-black/95 backdrop-blur-xl border-b border-orange-500/20 shadow-lg'
        : 'bg-black/90 backdrop-blur-lg border-b border-gray-800'
        }`}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-white cursor-pointer" onClick={() => navigate('/')}>
            Fit<span className="text-orange-500">Evolution</span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => navigate('/sales')} className="text-gray-300 hover:text-orange-500 transition-colors">
              Planos
            </button>
            <button onClick={() => navigate('/assessment')} className="text-gray-300 hover:text-orange-500 transition-colors">
              Avaliação
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="bg-black text-white border-black 
             hover:bg-black/80 hover:border-black 
             hover:text-white 
             px-8 py-4 text-lg backdrop-blur-sm transition-all duration-300"
            >
              <Play className="mr-2 w-5 h-5" />
              Entrar
            </Button>
            <Button
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium transition-all duration-300 transform hover:scale-105"
            >
              Começar Agora
            </Button>
          </div>
        </div>
      </nav>

      {/* Optimized Hero Section */}
      <OptimizedHeroSection />

      {/* Social Proof Section */}
      <section className="py-20 bg-white text-black">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-500 text-white px-4 py-2">
              <Award className="w-4 h-4 mr-2" />
              Comprovado por Milhares
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Por que <span className="text-orange-500">milhares de pessoas</span> escolheram a FitEvolution?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Resultados reais de pessoas reais. Veja como nossa metodologia científica
              está transformando vidas todos os dias com treinos personalizados.
            </p>
          </div>

          {/* Progress Chart */}
          <div className="mb-16 flex justify-center">
            <div className="w-full max-w-lg">
              <ProgressChart />
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                  <div className="border-t pt-4">
                    <p className="font-semibold">{testimonial.name}, {testimonial.age} anos</p>
                    <p className="text-orange-500 font-medium">{testimonial.result}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg font-medium transition-all duration-300 transform hover:scale-105"
            >
              Quero Começar Meu Treino
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-20 bg-gradient-to-r from-gray-900 to-black">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Tecnologia <span className="text-orange-500">Revolucionária</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Cada funcionalidade foi desenvolvida com base em ciência do esporte
              e feedback de milhares de usuários.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-center">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Showcase */}
      <section className="py-20 bg-white text-black">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">
                O Que Você Ganha com a <span className="text-orange-500">FitEvolution</span>
              </h2>
              <p className="text-xl text-gray-600">
                Mais que um app de treino. Uma metodologia completa para sua transformação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors duration-300"
                >
                  <CheckCircle className="w-6 h-6 text-orange-500 flex-shrink-0" />
                  <span className="text-gray-800 font-medium">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Começar Meu Treino Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                ✅ Acesso imediato • ✅ Treinos personalizados • ✅ Suporte especializado
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-black to-gray-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Seu Treino Personalizado<br />
              <span className="text-orange-500">Começa Hoje</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Junte-se a milhares de pessoas que já descobriram o poder da FitEvolution.
              <strong className="text-orange-400"> Treinos personalizados com IA</strong> adaptados aos seus objetivos.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button
                size="lg"
                onClick={() => navigate('/app')}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <TrendingUp className="mr-2 w-6 h-6" />
                Começar Agora
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500 mb-2">⚡ Resultados Rápidos</div>
                <div className="text-gray-300">Primeiras mudanças em 7 dias</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500 mb-2">🛡️ Garantia Total</div>
                <div className="text-gray-300">30 dias para testar sem riscos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500 mb-2">🏆 Suporte Premium</div>
                <div className="text-gray-300">Acompanhamento profissional 24/7</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-black text-white py-12 border-t border-gray-800">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold mb-4">
                9<span className="text-orange-500">FIT</span>
              </div>
              <p className="text-gray-400 mb-4">
                Transforme seu corpo com treinos personalizados por IA, acompanhamento profissional e metodologia científica.
              </p>
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Aplicativo</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => navigate('/dashboard')} className="hover:text-orange-500 transition-colors">Dashboard</button></li>
                <li><button onClick={() => navigate('/ai-training')} className="hover:text-orange-500 transition-colors">IA Training</button></li>
                <li><button onClick={() => navigate('/assessment')} className="hover:text-orange-500 transition-colors">Avaliação</button></li>
                <li><button onClick={() => navigate('/workout-manager')} className="hover:text-orange-500 transition-colors">Treinos</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Conta</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => navigate('/login')} className="hover:text-orange-500 transition-colors">Entrar</button></li>
                <li><button onClick={() => navigate('/register')} className="hover:text-orange-500 transition-colors">Registrar</button></li>
                <li><button onClick={() => navigate('/sales')} className="hover:text-orange-500 transition-colors">Planos</button></li>
                <li><button onClick={() => navigate('/pricing')} className="hover:text-orange-500 transition-colors">Preços</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Contato</h4>
              <ul className="space-y-2 text-gray-400">
                <li>📧 suporte@9fit.com</li>
                <li>📱 (11) 9xxxx-xxxx</li>
                <li>📍 São Paulo, SP</li>
                <li>🕒 Atendimento 24/7</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 FitEvolution. Todos os direitos reservados. Transforme-se com treinos inteligentes e personalizados.</p>
          </div>
        </div>
      </footer>

      {/* Floating Components */}
      <WhatsAppFloat />
      <ExitIntentPopup />
    </div>
  );
};

export default Index;
