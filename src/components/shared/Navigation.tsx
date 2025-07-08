
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Dumbbell, User } from "lucide-react";

export const Navigation = () => {
  return (
    <nav className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Dumbbell className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold text-orange-500">Rony Trainer</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/rony-trainer" className="text-gray-600 hover:text-gray-900 transition-colors">
              App Principal
            </Link>
            <Link to="/workout-manager" className="text-gray-600 hover:text-gray-900 transition-colors">
              Gerenciador
            </Link>
            <Link to="/sales" className="text-gray-600 hover:text-gray-900 transition-colors">
              Planos
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link to="/rony-trainer">
                <User className="w-4 h-4 mr-2" />
                Acessar App
              </Link>
            </Button>
            <Button asChild className="bg-orange-500 hover:bg-orange-600">
              <Link to="/rony-trainer">Começar Treino</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
