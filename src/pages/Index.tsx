
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Calendar, ChartLine } from "lucide-react";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { MethodSection } from "@/components/sections/MethodSection";
import { CTASection } from "@/components/sections/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-orange-500">WellnessHub</div>
          <div className="hidden md:flex space-x-6">
            <a href="#features" className="text-foreground hover:text-orange-500 transition-colors">Funcionalidades</a>
            <a href="#method" className="text-foreground hover:text-orange-500 transition-colors">Método</a>
            <a href="#pricing" className="text-foreground hover:text-orange-500 transition-colors">Preços</a>
          </div>
          <div className="flex space-x-4">
            <Button variant="outline">Login</Button>
            <Button className="bg-orange-500 hover:bg-orange-600">Baixar App</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* Method Section */}
      <MethodSection />

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-orange-500 mb-4">WellnessHub</h3>
              <p className="text-gray-300">
                Transforme seu corpo com ciência e tecnologia.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Treinos Personalizados</li>
                <li>Evolução Física</li>
                <li>Gamificação</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Sobre Nós</li>
                <li>Contato</li>
                <li>Blog</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-300">
                <li>FAQ</li>
                <li>Ajuda</li>
                <li>Termos de Uso</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 WellnessHub. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
