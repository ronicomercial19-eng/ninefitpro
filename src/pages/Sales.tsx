
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Star, ArrowRight, Crown, Zap, Shield, Award } from "lucide-react";

const Sales = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-lg border-b border-gray-100 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-serif font-bold text-black">
            Elite<span className="text-yellow-600">Fitness</span>
          </div>
          <div className="flex items-center space-x-4">
            <a href="tel:+5511999999999" className="text-gray-700 hover:text-yellow-600 transition-colors">
              (11) 99999-9999
            </a>
            <Button className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium">
              Consultoria Gratuita
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge className="mb-6 bg-yellow-50 text-yellow-800 border-yellow-200 px-4 py-2">
            <Crown className="w-4 h-4 mr-2" />
            Exclusivo para Executivos de São Paulo
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-black mb-6 leading-tight">
            Transforme Seu Corpo<br />
            <span className="text-yellow-600">Sem Comprometer</span><br />
            Sua Agenda
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            O único ecossistema fitness premium que combina personal training presencial, 
            tecnologia de ponta e acompanhamento 24/7 para executivos que valorizam 
            resultados excepcionais em tempo mínimo.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button size="lg" className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg font-medium">
              Agende Sua Consultoria Premium
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-gray-300 px-8 py-4 text-lg">
              Ver Cases de Sucesso
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-black">97%</div>
              <div className="text-gray-600">Taxa de Sucesso</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-black">60 dias</div>
              <div className="text-gray-600">Resultados Visíveis</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-black">200+</div>
              <div className="text-gray-600">Executivos Transformados</div>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-black mb-4">
              Ecossistema Fitness <span className="text-yellow-600">Premium</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Sete pilares integrados para sua transformação completa
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Crown className="w-8 h-8 text-yellow-600" />,
                title: "Personal Presencial VIP",
                description: "Treinos personalizados em estúdios premium com os melhores profissionais de SP"
              },
              {
                icon: <Zap className="w-8 h-8 text-yellow-600" />,
                title: "Programas Online Elite",
                description: "Planos sob medida que se adaptam à sua rotina e objetivos específicos"
              },
              {
                icon: <Award className="w-8 h-8 text-yellow-600" />,
                title: "Netflix Fitness",
                description: "Biblioteca exclusiva com mais de 500 treinos e masterclasses"
              },
              {
                icon: <Shield className="w-8 h-8 text-yellow-600" />,
                title: "Avaliação com Dados",
                description: "Análise completa com Power BI, bioimpedância e acompanhamento em tempo real"
              },
              {
                icon: <Star className="w-8 h-8 text-yellow-600" />,
                title: "Produtos Premium",
                description: "Suplementação personalizada e equipamentos de alta performance"
              },
              {
                icon: <Crown className="w-8 h-8 text-yellow-600" />,
                title: "Mentorias Executivas",
                description: "Coaching de performance e mindset para líderes de alta performance"
              }
            ].map((service, index) => (
              <Card key={index} className="p-8 border-0 shadow-lg hover:shadow-xl transition-shadow bg-white">
                <div className="mb-4">{service.icon}</div>
                <h3 className="text-xl font-semibold text-black mb-3">{service.title}</h3>
                <p className="text-gray-600 leading-relaxed">{service.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-serif font-bold text-black mb-6">
                Benefícios que Impactam<br />
                <span className="text-yellow-600">Sua Vida Toda</span>
              </h2>
              
              <div className="space-y-6">
                {[
                  {
                    title: "Saúde Otimizada",
                    description: "Prevenção de doenças, energia duradoura e qualidade de vida superior"
                  },
                  {
                    title: "Estética Premium",
                    description: "Corpo definido, postura impecável e presença marcante"
                  },
                  {
                    title: "Longevidade Ativa",
                    description: "Envelhecimento saudável com vitalidade e independência"
                  },
                  {
                    title: "Performance Executiva",
                    description: "Maior foco, resistência mental e capacidade de liderança"
                  }
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <Check className="w-6 h-6 text-yellow-600 mt-1 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-black mb-1">{benefit.title}</h3>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 rounded-2xl">
              <div className="text-center">
                <div className="w-24 h-24 bg-yellow-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Crown className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-black mb-4">Garantia de Resultados</h3>
                <p className="text-gray-700 mb-6">
                  Se você não ver resultados significativos em 90 dias, 
                  devolvemos 100% do investimento.
                </p>
                <Badge className="bg-yellow-600 text-white px-4 py-2">
                  Risco Zero Para Você
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-black text-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold mb-4">
              Cases de <span className="text-yellow-600">Transformação</span>
            </h2>
            <p className="text-xl text-gray-300">
              Executivos que revolucionaram sua saúde e performance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Carlos Eduardo",
                role: "CEO, Fintech",
                result: "-15kg em 4 meses",
                quote: "Consegui resultados que nunca imaginei possíveis, mesmo com minha agenda impossível."
              },
              {
                name: "Ana Beatriz",
                role: "Diretora, Multinacional",
                result: "Definição muscular premium",
                quote: "A metodologia é simplesmente superior. Treino 3x por semana e tenho resultados de quem treina todos os dias."
              },
              {
                name: "Roberto Silva",
                role: "Sócio, Consultoria",
                result: "Performance executiva 300% melhor",
                quote: "Minha energia e foco aumentaram drasticamente. Melhores decisões, melhor liderança."
              }
            ].map((testimonial, index) => (
              <Card key={index} className="p-8 bg-gray-900 border-gray-800 text-center">
                <div className="flex justify-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-600 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 italic">"{testimonial.quote}"</p>
                <div className="border-t border-gray-700 pt-4">
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-gray-400 text-sm">{testimonial.role}</div>
                  <Badge className="mt-2 bg-yellow-600 text-white">
                    {testimonial.result}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-black mb-4">
              Planos <span className="text-yellow-600">Premium</span>
            </h2>
            <p className="text-xl text-gray-600">
              Escolha o nível de transformação ideal para você
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Executive",
                price: "R$ 2.500",
                period: "/mês",
                popular: false,
                features: [
                  "4 sessões Personal/mês",
                  "Programa Online personalizado",
                  "Avaliação mensal completa",
                  "Netflix Fitness incluso",
                  "Suporte via WhatsApp"
                ]
              },
              {
                name: "Elite",
                price: "R$ 4.500",
                period: "/mês",
                popular: true,
                features: [
                  "8 sessões Personal/mês",
                  "Programa Online premium",
                  "Avaliação quinzenal",
                  "Netflix Fitness + Masterclasses",
                  "Suplementação personalizada",
                  "Mentoria mensal",
                  "Suporte concierge 24/7"
                ]
              },
              {
                name: "Chairman",
                price: "R$ 8.500",
                period: "/mês",
                popular: false,
                features: [
                  "Personal training ilimitado",
                  "Programa 100% customizado",
                  "Avaliação semanal",
                  "Acesso completo ao ecossistema",
                  "Produtos premium inclusos",
                  "Mentoria semanal",
                  "Personal concierge dedicado",
                  "Acesso à comunidade VIP"
                ]
              }
            ].map((plan, index) => (
              <Card key={index} className={`p-8 ${plan.popular ? 'border-2 border-yellow-600 shadow-2xl' : 'border shadow-lg'} relative`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white px-4 py-1">
                    Mais Escolhido
                  </Badge>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-black mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold text-black">
                    {plan.price}
                    <span className="text-lg text-gray-600 font-normal">{plan.period}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-yellow-600 shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  className={`w-full ${plan.popular ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-black hover:bg-gray-800'} text-white py-3`}
                >
                  Começar Agora
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-black mb-4">
              Perguntas <span className="text-yellow-600">Frequentes</span>
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {[
              {
                question: "Como funciona a garantia de resultados?",
                answer: "Se você seguir nosso protocolo por 90 dias e não ver resultados significativos, devolvemos 100% do investimento. Nossa taxa de sucesso é de 97% porque nossa metodologia é comprovada."
              },
              {
                question: "Quanto tempo por semana preciso dedicar?",
                answer: "Nossos executivos treinam entre 3-4 horas por semana e obtêm resultados superiores. Nossa metodologia otimiza cada minuto do seu treino para máxima eficiência."
              },
              {
                question: "Posso cancelar a qualquer momento?",
                answer: "Sim, mas raramente acontece. 94% dos nossos clientes renovam porque os resultados são excepcionais. Não há fidelidade porque confiamos na qualidade do nosso serviço."
              },
              {
                question: "Como é o acompanhamento nutricional?",
                answer: "Você recebe um plano nutricional personalizado, suplementação otimizada e acompanhamento via app. Tudo integrado com seus dados de treino e evolução."
              },
              {
                question: "Vocês atendem em casa ou escritório?",
                answer: "Sim, nossos personal trainers VIP podem atender no local de sua preferência em SP. Também temos estúdios premium em pontos estratégicos da cidade."
              }
            ].map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="bg-white border border-gray-200 rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold text-black py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-black text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-serif font-bold mb-4">
            Sua Transformação <span className="text-yellow-600">Começa Hoje</span>
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Junte-se aos 200+ executivos que já revolucionaram sua saúde, 
            estética e performance com nosso ecossistema premium.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button size="lg" className="bg-yellow-600 hover:bg-yellow-700 text-black px-8 py-4 text-lg font-medium">
              Agendar Consultoria Gratuita
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <a 
              href="https://wa.me/5511999999999" 
              className="text-yellow-600 hover:text-yellow-500 font-medium"
            >
              Ou tire suas dúvidas via WhatsApp →
            </a>
          </div>
          
          <p className="text-sm text-gray-400">
            ✅ Consultoria gratuita • ✅ Sem compromisso • ✅ Resultados garantidos
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-serif font-bold mb-4">
                Elite<span className="text-yellow-600">Fitness</span>
              </div>
              <p className="text-gray-400 mb-4">
                O ecossistema fitness premium para executivos de alta performance.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-yellow-600 transition-colors">Instagram</a>
                <a href="#" className="text-gray-400 hover:text-yellow-600 transition-colors">LinkedIn</a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Serviços</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Personal Training VIP</li>
                <li>Programas Online</li>
                <li>Netflix Fitness</li>
                <li>Mentorias Executivas</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <ul className="space-y-2 text-gray-400">
                <li>São Paulo, SP</li>
                <li>(11) 99999-9999</li>
                <li>contato@elitefitness.com</li>
                <li>WhatsApp 24/7</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Termos de Uso</li>
                <li>Política de Privacidade</li>
                <li>Política de Cancelamento</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 EliteFitness. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Sales;
