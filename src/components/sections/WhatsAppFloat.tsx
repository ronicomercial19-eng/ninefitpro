import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const WhatsAppFloat = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const whatsappNumber = "5511999999999"; // [SEU NÚMERO DO WHATSAPP]
  const message = "Olá! Quero saber mais sobre os planos de treino da FitEvolution 💪";

  const handleWhatsAppClick = () => {
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isExpanded && (
        <div className="mb-4 bg-white rounded-lg shadow-xl p-4 max-w-xs animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-gray-800">💬 Fale Conosco</h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(false)}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Dúvidas sobre nossos planos? Fale direto com nosso time!
          </p>
          <Button
            onClick={handleWhatsAppClick}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
            size="sm"
          >
            Conversar no WhatsApp
          </Button>
        </div>
      )}
      
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
        size="lg"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    </div>
  );
};