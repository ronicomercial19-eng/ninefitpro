import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const Navigation9Fit = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/conecte-se");
  };

  return (
    <nav className="border-b bg-white sticky top-0 z-50 shadow-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-[#FF8426] to-[#F04E23] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">9</span>
            </div>
            <span className="text-2xl font-bold text-[#282E3A]">
              9<span className="text-[#FF8426]">FIT</span>
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-[#282E3A] hover:text-[#FF8426] transition-colors font-medium">
              Início
            </Link>
            <Link to="/descobrir" className="text-[#282E3A] hover:text-[#FF8426] transition-colors font-medium">
              Descobrir
            </Link>
            <Link to="/lista-de-alunos" className="text-[#282E3A] hover:text-[#FF8426] transition-colors font-medium">
              Alunos
            </Link>
            <Link to="/biblioteca-de-exercicios" className="text-[#282E3A] hover:text-[#FF8426] transition-colors font-medium">
              Exercícios
            </Link>
            <Link to="/calendario" className="text-[#282E3A] hover:text-[#FF8426] transition-colors font-medium">
              Calendário
            </Link>
          </div>
          
          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Button variant="ghost" asChild className="text-[#282E3A]">
                  <Link to="/painel-geral">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="ghost" asChild className="text-[#282E3A]">
                  <Link to="/perfil">
                    <User className="w-4 h-4 mr-2" />
                    Perfil
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="text-[#282E3A]"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild className="text-[#282E3A]">
                  <Link to="/conecte-se">Entrar</Link>
                </Button>
                <Button asChild className="btn-9fit">
                  <Link to="/conecte-se">Começar Agora</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-[#282E3A]"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            <Link 
              to="/" 
              className="block text-[#282E3A] hover:text-[#FF8426] transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Início
            </Link>
            <Link 
              to="/descobrir" 
              className="block text-[#282E3A] hover:text-[#FF8426] transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Descobrir
            </Link>
            <Link 
              to="/lista-de-alunos" 
              className="block text-[#282E3A] hover:text-[#FF8426] transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Alunos
            </Link>
            <Link 
              to="/biblioteca-de-exercicios" 
              className="block text-[#282E3A] hover:text-[#FF8426] transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Exercícios
            </Link>
            <Link 
              to="/calendario" 
              className="block text-[#282E3A] hover:text-[#FF8426] transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Calendário
            </Link>
            {user && (
              <>
                <Link 
                  to="/painel-geral" 
                  className="block text-[#282E3A] hover:text-[#FF8426] transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/perfil" 
                  className="block text-[#282E3A] hover:text-[#FF8426] transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Perfil
                </Link>
                <button 
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left text-[#282E3A] hover:text-[#FF8426] transition-colors font-medium"
                >
                  Sair
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
