import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Target,
  Zap,
  CheckCircle,
  Play,
  TrendingUp,
  Smartphone,
  ClipboardList,
  BarChart3,
  RefreshCw,
  Mail
} from "lucide-react";
import { OptimizedHeroSection } from "@/components/sections/OptimizedHeroSection";
import { WhatsAppFloat } from "@/components/sections/WhatsAppFloat";
import { ExitIntentPopup } from "@/components/sections/ExitIntentPopup";

const Index = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: <ClipboardList className="w-8 h-8 text-orange-500" />,
      title: "Planejamento e execução",
      description: "Organize e execute seus treinos em um só lugar, com clareza do que fazer em cada sessão."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-orange-500" />,
      title: "Registro de evolução",
      description: "Registre sessões, cargas e medidas. Tenha o histórico real do que você fez."
    },
    {
      icon: <RefreshCw className="w-8 h-8 text-orange-500" />,
      title: "Ajustes conforme o contexto",
      description: "Adapte o treino quando a rotina ou o corpo mudam, com base no que você registra."
    },
    {
      icon: <Smartphone className="w-8 h-8 text-orange-500" />,
      title: "App no celular",
      description: "Acesse pelo celular (PWA). Instale na tela inicial e use de forma prática no dia a dia."
    }
  ];

  const benefits = [
    "Planejamento e execução dos treinos no app",
    "Registro de sessões, cargas e evolução",
    "Avaliação guiada e histórico das suas medidas",
    "Ajustes de treino conforme o contexto informado",
    "Suporte pelo app, com resposta por e-mail em até 24 horas"
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrollY > 50
            ? "bg-black/95 backdrop-blur-xl border-b border-orange-500/20 shadow-lg"
            : "bg-black/90 backdrop-blur-lg border-b border-gray-800"
        }`}
      >
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div
            className="text-2xl font-bold text-white cursor-pointer"
            onClick={() => navigate("/")}
          >
            9<span className="text-orange-500">FIT</span> PRO
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => navigate("/sales")}
              className="text-gray-300 hover:text-orange-500 transition-colors"
            >
              Planos
            </button>
            <button
              onClick={() => navigate("/assessment")}
              className="text-gray-300 hover:text-orange-500 transition-colors"
            >
              Avaliação
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="bg-black text-white border-gray-700 hover:bg-gray-900 hover:border-orange-500 hover:text-white px-6 py-3 backdrop-blur-sm transition-all duration-300"
            >
              <Play className="mr-2 w-5 h-5" />
              Entrar
            </Button>
            <Button
              onClick={() => navigate("/sales")}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium transition-all duration-300"
            >
              Conhecer o 9FIT PRO
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <OptimizedHeroSection />

      {/* Proposta principal */}
      <section className="py-20 bg-white text-black">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <Badge className="mb-4 bg-orange-500 text-white px-4 py-2">
              Seu treino organizado. Sua evolução registrada.
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Pare de treinar no improviso
            </h2>
            <p className="text-xl text-gray-600">
              O 9FIT PRO reúne planejamento, execução e histórico em um só lugar.
              Você registra o que faz e acompanha a evolução com clareza — sem
              promessas milagrosas, só organização e continuidade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-orange-100"
              >
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">{feature.icon}</div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              size="lg"
              onClick={() => navigate("/sales")}
              className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg font-medium transition-all duration-300"
            >
              Ver planos
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* O que está incluído */}
      <section className="py-20 bg-gradient-to-r from-gray-900 to-black">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              O que você tem no <span className="text-orange-500">9FIT PRO</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Benefícios reais da assinatura. Sem enrolação.
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-4">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <CheckCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-200 font-medium">{benefit}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-8 max-w-xl mx-auto">
            Profissionais (personal, etc.) são contratados separadamente via Staff,
            conforme disponibilidade. A assinatura não inclui consultas,
            acompanhamento individual humano ou atendimento de urgência.
          </p>

          <div className="text-center mt-10">
            <Button
              size="lg"
              onClick={() => navigate("/sales")}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 text-lg font-semibold shadow-lg transition-all duration-300"
            >
              Conhecer o 9FIT PRO
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-20 bg-white text-black">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Como funciona</h2>
            <p className="text-xl text-gray-600">
              Simples e direto.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6">
              <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-lg mb-2">Entre com sua conta</h3>
              <p className="text-gray-600 text-sm">
                Acesse o app e veja os recursos disponíveis para o seu plano.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-lg mb-2">Planeje e execute</h3>
              <p className="text-gray-600 text-sm">
                Siga o planejamento, registre sessões e cargas no dia a dia.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-lg mb-2">Acompanhe a evolução</h3>
              <p className="text-gray-600 text-sm">
                Consulte histórico, avaliações e ajuste o treino conforme o contexto.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 bg-gradient-to-r from-black to-gray-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Seu treino organizado.
              <br />
              <span className="text-orange-500">Sua evolução registrada.</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              9FIT PRO — planejamento, execução e histórico em um só lugar.
              A partir de R$ 97/mês.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                onClick={() => navigate("/sales")}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 text-lg font-semibold shadow-lg transition-all duration-300"
              >
                <TrendingUp className="mr-2 w-6 h-6" />
                Ver planos
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="border-gray-600 text-white hover:bg-white/10 px-8 py-4 text-lg"
              >
                Já tenho conta — Entrar
              </Button>
            </div>

            <p className="text-sm text-gray-400 mt-6 flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              Suporte por e-mail em até 24 horas
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 border-t border-gray-800">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-2xl font-bold mb-4">
                9<span className="text-orange-500">FIT</span> PRO
              </div>
              <p className="text-gray-400 mb-4 text-sm">
                Seu treino organizado. Sua evolução registrada.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Navegação</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <button
                    onClick={() => navigate("/sales")}
                    className="hover:text-orange-500 transition-colors"
                  >
                    Planos
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/auth")}
                    className="hover:text-orange-500 transition-colors"
                  >
                    Entrar
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/suporte")}
                    className="hover:text-orange-500 transition-colors"
                  >
                    Suporte
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Contato</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>📧 9fit.nine@gmail.com</li>
                <li>Resposta em até 24 horas</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} 9FIT PRO. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      <WhatsAppFloat />
      <ExitIntentPopup />
    </div>
  );
};

export default Index;
