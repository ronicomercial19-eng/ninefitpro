
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { User, LogOut } from "lucide-react";

export const Navigation = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-orange-500">
            WellnessHub
          </Link>
          
          {user ? (
            // Navigation for logged in users
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
                Dashboard
              </Link>
              <Link to="/workout-manager" className="text-gray-600 hover:text-gray-900 transition-colors">
                Treinos
              </Link>
            </div>
          ) : (
            // Navigation for non-logged users
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                Início
              </Link>
              <Link to="/sales" className="text-gray-600 hover:text-gray-900 transition-colors">
                Fitness
              </Link>
            </div>
          )}
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-2 text-gray-600">
                  <User size={20} />
                  <span className="hidden sm:block">Olá, {user.name}</span>
                </div>
                <Button variant="ghost" onClick={handleLogout} size="sm">
                  <LogOut size={16} className="mr-2" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild className="bg-orange-500 hover:bg-orange-600">
                  <Link to="/register">Criar Conta</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
