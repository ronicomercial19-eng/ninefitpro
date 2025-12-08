import { Navigation9Fit } from '@/components/shared/Navigation9Fit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Mail, 
  Phone, 
  HelpCircle, 
  Book, 
  Video,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function Support() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate ticket submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Ticket criado!",
        description: "Nossa equipe responderá em breve.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o ticket.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      question: "Como criar um novo plano de treino?",
      answer: "Acesse o menu 'Treinos' e clique em 'Novo Plano'. Preencha as informações do aluno e selecione os exercícios desejados."
    },
    {
      question: "Como gerenciar meus alunos?",
      answer: "No menu 'Alunos' você pode adicionar, editar e visualizar todos os seus alunos. Use os filtros para encontrar rapidamente."
    },
    {
      question: "Como funciona a biblioteca de exercícios?",
      answer: "A biblioteca contém centenas de exercícios com vídeos e instruções. Você pode filtrar por grupo muscular e adicionar aos treinos."
    },
    {
      question: "Posso personalizar os exercícios?",
      answer: "Sim! Você pode adicionar seus próprios exercícios com vídeos e instruções personalizadas."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navigation9Fit />
      
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#282E3A] mb-2">Central de Ajuda</h1>
          <p className="text-[#666666]">Estamos aqui para ajudar você a ter a melhor experiência</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Contact Cards */}
          <Card className="shadow-card hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-r from-[#FF8426] to-[#F04E23] rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#282E3A]">Chat ao Vivo</h3>
                <p className="text-sm text-[#666666]">Fale conosco em tempo real</p>
                <Button className="btn-9fit w-full">
                  Iniciar Chat
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-r from-[#FF8426] to-[#F04E23] rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#282E3A]">Email</h3>
                <p className="text-sm text-[#666666]">suporte@9fit.com.br</p>
                <Button variant="outline" className="w-full">
                  Enviar Email
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-r from-[#FF8426] to-[#F04E23] rounded-full flex items-center justify-center">
                  <Phone className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#282E3A]">Telefone</h3>
                <p className="text-sm text-[#666666]">(11) 3000-0000</p>
                <Button variant="outline" className="w-full">
                  Ligar Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <Tabs defaultValue="faq" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="faq" className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  FAQ
                </TabsTrigger>
                <TabsTrigger value="guides" className="flex items-center gap-2">
                  <Book className="w-4 h-4" />
                  Guias
                </TabsTrigger>
                <TabsTrigger value="ticket" className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Abrir Ticket
                </TabsTrigger>
              </TabsList>

              <TabsContent value="faq" className="space-y-4 mt-6">
                <h2 className="text-2xl font-bold text-[#282E3A] mb-4">Perguntas Frequentes</h2>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <Card key={index} className="border-l-4 border-l-[#FF8426]">
                      <CardHeader>
                        <CardTitle className="text-lg text-[#282E3A]">{faq.question}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-[#666666]">{faq.answer}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="guides" className="space-y-4 mt-6">
                <h2 className="text-2xl font-bold text-[#282E3A] mb-4">Guias e Tutoriais</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="shadow-card hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-[#FF8426]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Video className="w-6 h-6 text-[#FF8426]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#282E3A] mb-2">Primeiros Passos</h3>
                          <p className="text-sm text-[#666666]">Aprenda a configurar sua conta e começar a usar a plataforma</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-card hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-[#FF8426]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Video className="w-6 h-6 text-[#FF8426]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#282E3A] mb-2">Criando Planos de Treino</h3>
                          <p className="text-sm text-[#666666]">Tutorial completo sobre como criar treinos personalizados</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-card hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-[#FF8426]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Video className="w-6 h-6 text-[#FF8426]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#282E3A] mb-2">Gerenciamento de Alunos</h3>
                          <p className="text-sm text-[#666666]">Como adicionar e gerenciar seus alunos eficientemente</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-card hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-[#FF8426]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Video className="w-6 h-6 text-[#FF8426]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#282E3A] mb-2">Biblioteca de Exercícios</h3>
                          <p className="text-sm text-[#666666]">Explore e utilize nossa vasta biblioteca de exercícios</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="ticket" className="space-y-4 mt-6">
                <h2 className="text-2xl font-bold text-[#282E3A] mb-4">Abrir Ticket de Suporte</h2>
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input id="name" placeholder="Seu nome completo" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="seu@email.com" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Assunto</Label>
                    <Input id="subject" placeholder="Descreva brevemente o problema" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem</Label>
                    <Textarea 
                      id="message" 
                      placeholder="Descreva detalhadamente seu problema ou dúvida"
                      rows={6}
                      required
                    />
                  </div>

                  <Button type="submit" className="btn-9fit" disabled={loading}>
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? 'Enviando...' : 'Enviar Ticket'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
