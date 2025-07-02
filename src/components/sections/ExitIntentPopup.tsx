import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Gift, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ExitIntentPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShown) {
        setIsOpen(true);
        setHasShown(true);
      }
    };

    // Show popup after 30 seconds if user hasn't left
    const timer = setTimeout(() => {
      if (!hasShown) {
        setIsOpen(true);
        setHasShown(true);
      }
    }, 30000);

    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timer);
    };
  }, [hasShown]);

  const handleCTAClick = () => {
    setIsOpen(false);
    navigate('/sales');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md mx-auto bg-gradient-to-br from-black to-gray-900 border-orange-500/20 text-white">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <Badge className="bg-red-500 text-white mb-4">
              <Clock className="w-4 h-4 mr-1" />
              Oferta Especial
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            🔥 Antes de sair...
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Gift className="w-16 h-16 text-orange-500" />
          </div>
          
          <h3 className="text-xl font-semibold">
            Ganhe <span className="text-orange-500">7 dias grátis</span> do nosso plano Premium!
          </h3>
          
          <p className="text-gray-300">
            Acesse nossa IA de treinos, planos personalizados e acompanhamento profissional 
            sem pagar nada nos primeiros 7 dias.
          </p>
          
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
            <p className="text-sm text-orange-300">
              <strong>Exclusivo para hoje:</strong> Sem compromisso, cancele quando quiser. 
              Mais de 500 pessoas já transformaram seus corpos este mês.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={handleCTAClick}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black font-semibold py-3"
            >
              Quero Meus 7 Dias Grátis
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="w-full text-gray-400 hover:text-white"
            >
              Não, obrigado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};