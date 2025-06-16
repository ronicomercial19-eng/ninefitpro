
import { Button } from "@/components/ui/button";

export const CTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold text-white mb-6">
          Pronto para transformar seu corpo?
        </h2>
        <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
          Junte-se a mais de 10.000 pessoas que já estão vendo resultados reais
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            className="bg-white text-orange-500 hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
          >
            Baixar App - Grátis
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-white text-white hover:bg-white hover:text-orange-500 px-8 py-4 text-lg"
          >
            Falar com Especialista
          </Button>
        </div>
        
        <p className="text-orange-100 mt-6 text-sm">
          ✅ Sem compromisso • ✅ Resultados em 30 dias • ✅ Suporte 24h
        </p>
      </div>
    </section>
  );
};
