import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowLeft, LogIn } from "lucide-react";

export default function WhatsAppRedirect() {
  const navigate = useNavigate();
  const whatsappNumber = "5511999999999"; // Substitua pelo número real
  const message = "Olá! Acabei de responder o questionário no 9FIT e gostaria de saber mais sobre os treinos.";

  const handleWhatsAppRedirect = () => {
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Questionário Concluído!</CardTitle>
          <p className="text-muted-foreground">
            Obrigado por responder nosso questionário. Entre em contato conosco via WhatsApp para começar sua jornada fitness!
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
            size="lg"
            onClick={handleWhatsAppRedirect}
          >
            <MessageCircle className="w-5 h-5" />
            Falar no WhatsApp
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Ou
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              Você é professor?
            </p>
            <Button 
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate('/login')}
            >
              <LogIn className="w-4 h-4" />
              Fazer Login como Professor
            </Button>
          </div>

          <Button 
            variant="ghost"
            className="w-full gap-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
