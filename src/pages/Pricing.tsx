
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  Star, 
  Crown, 
  Zap, 
  Users, 
  Code, 
  Smartphone,
  Database,
  Shield,
  Headphones
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";

const Pricing = () => {
  const plans = [
    {
      name: "Free",
      price: "R$ 0",
      period: "/mês",
      badge: null,
      description: "Perfeito para começar e testar a plataforma",
      features: [
        "1 projeto ativo",
        "100 créditos por mês",
        "Templates básicos",
        "Suporte via comunidade",
        "Hospedagem gratuita"
      ],
      limitations: [
        "Sem exportação de código",
        "Marca d'água Lovable",
        "Recursos limitados"
      ],
      cta: "Começar Grátis",
      popular: false,
      color: "border-gray-200"
    },
    {
      name: "Pro",
      price: "R$ 49",
      period: "/mês",
      badge: <Badge className="bg-blue-600 text-white"><Star className="w-4 h-4 mr-1" />Mais Escolhido</Badge>,
      description: "Ideal para desenvolvedores e freelancers",
      features: [
        "Projetos ilimitados",
        "3.000 créditos por mês",
        "Exportação de código completa",
        "Integrações avançadas",
        "Suporte prioritário",
        "Templates premium",
        "Hospedagem custom",
        "Análises detalhadas"
      ],
      limitations: [],
      cta: "Assinar Pro",
      popular: true,
      color: "border-blue-500 shadow-lg"
    },
    {
      name: "Teams",
      price: "R$ 149",
      period: "/mês",
      badge: <Badge className="bg-purple-600 text-white"><Users className="w-4 h-4 mr-1" />Equipes</Badge>,
      description: "Para times e startups em crescimento",
      features: [
        "Tudo do plano Pro",
        "Até 5 usuários inclusos",
        "10.000 créditos por mês",
        "Acesso via SSO",
        "Suporte dedicado",
        "Colaboração em tempo real",
        "Controle de permissões",
        "Relatórios avançados"
      ],
      limitations: [],
      cta: "Assinar Teams",
      popular: false,
      color: "border-purple-500"
    }
  ];

  const benefits = [
    {
      icon: <Zap className="w-6 h-6 text-blue-600" />,
      title: "Prototipagem Rápida",
      description: "Crie protótipos funcionais em minutos, sem código"
    },
    {
      icon: <Code className="w-6 h-6 text-blue-600" />,
      title: "Código Real",
      description: "Exporte React, TypeScript, Tailwind CSS limpo e profissional"
    },
    {
      icon: <Database className="w-6 h-6 text-blue-600" />,
      title: "Integrações Nativas",
      description: "Supabase, Auth0, Stripe e mais de 50 integrações"
    },
    {
      icon: <Smartphone className="w-6 h-6 text-blue-600" />,
      title: "Mobile First",
      description: "Todos os projetos são responsivos por padrão"
    }
  ];

  const testimonials = [
    {
      name: "Carlos Silva",
      role: "Founder, TechStart",
      content: "Consegui validar minha startup em 2 semanas ao invés de 2 meses.",
      avatar: "CS"
    },
    {
      name: "Maria Santos",
      role: "Freelancer",
      content: "Triplicou minha produtividade. Entrego projetos 5x mais rápido.",
      avatar: "MS"
    },
    {
      name: "João Pedro",
      role: "CTO, FinTech Pro",
      content: "A qualidade do código exportado é impressionante.",
      avatar: "JP"
    }
  ];

  const faqs = [
    {
      question: "Como funcionam os créditos?",
      answer: "Cada ação na plataforma consome créditos: criação de componentes (2 créditos), modificações (1 crédito), exportação (5 créditos). Os créditos são renovados mensalmente."
    },
    {
      question: "Posso mudar de plano a qualquer momento?",
      answer: "Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. Mudanças são aplicadas no próximo ciclo de cobrança."
    },
    {
      question: "O que acontece quando os créditos acabam?",
      answer: "Você pode continuar visualizando seus projetos, mas não poderá fazer modificações até o próximo ciclo ou upgrade do plano."
    },
    {
      question: "Posso exportar código no plano Free?",
      answer: "Não, a exportação de código está disponível apenas nos planos Pro e Teams. No Free você pode visualizar e testar seus projetos."
    },
    {
      question: "Existe desconto anual?",
      answer: "Sim! Pagando anualmente você economiza 2 meses (20% de desconto) em todos os planos pagos."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              Lovable
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-600 hover:text-gray-900">Início</Link>
              <Link to="/pricing" className="text-blue-600 font-medium">Preços</Link>
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link to="/dashboard">Entrar</Link>
              </Button>
              <Button asChild>
                <Link to="/pricing">Começar Grátis</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Planos simples para <span className="text-blue-600">escalar sua ideia</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Comece grátis. Escale conforme seu time cresce. Sem surpresas, sem taxas ocultas.
          </p>
          <div className="flex items-center justify-center space-x-4 mb-12">
            <Badge variant="outline" className="px-4 py-2">
              <Shield className="w-4 h-4 mr-2" />
              30 dias de garantia
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              <Zap className="w-4 h-4 mr-2" />
              Cancele quando quiser
            </Badge>
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.color} ${plan.popular ? 'scale-105' : ''}`}>
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    {plan.badge}
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-1">{plan.period}</span>
                  </div>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation, limitIndex) => (
                      <li key={limitIndex} className="flex items-start opacity-60">
                        <div className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 border border-gray-300 rounded-full"></div>
                        <span className="text-gray-500 line-through">{limitation}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full py-3 text-lg font-medium ${
                      plan.popular 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                    asChild
                  >
                    <Link to="/dashboard">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Precisa de mais? <strong>Planos Enterprise</strong> personalizados disponíveis
            </p>
            <Button variant="outline" size="lg">
              Falar com Vendas
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Por que escolher nossa plataforma?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Construa aplicações reais com a velocidade do no-code e a flexibilidade do código
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              O que nossos usuários dizem
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="pt-0">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mr-4">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-600">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 italic">"{testimonial.content}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-xl text-gray-600">
              Tire suas dúvidas sobre nossos planos
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible>
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto para acelerar seus projetos?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de desenvolvedores que já estão construindo o futuro mais rápido
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
              asChild
            >
              <Link to="/dashboard">Começar Grátis</Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg"
            >
              <Headphones className="w-5 h-5 mr-2" />
              Falar com Especialista
            </Button>
          </div>
          
          <p className="text-blue-100 mt-6 text-sm">
            ✅ Sem cartão de crédito • ✅ Setup em 2 minutos • ✅ Suporte em português
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Lovable</h3>
              <p className="text-gray-400">
                A plataforma mais rápida para criar aplicações web profissionais.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/pricing" className="hover:text-white">Preços</Link></li>
                <li><Link to="/dashboard" className="hover:text-white">Dashboard</Link></li>
                <li><a href="#" className="hover:text-white">Documentação</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Sobre</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Carreiras</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Ajuda</a></li>
                <li><a href="#" className="hover:text-white">Contato</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Lovable. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
