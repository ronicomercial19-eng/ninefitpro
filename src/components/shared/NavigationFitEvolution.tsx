import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const NavigationFitEvolution = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, isTrainer } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">9</span>
            </div>
            <span className="text-2xl font-bold text-foreground">
              9<span className="text-primary">FIT</span>
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-foreground hover:text-primary transition-colors font-medium">
              Início
            </Link>
            <Link to="/sales" className="text-foreground hover:text-primary transition-colors font-medium">
              Planos
            </Link>
            <Link to="/assessment" className="text-foreground hover:text-primary transition-colors font-medium">
              Avaliação
            </Link>
          </div>
          
          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Button variant="ghost" asChild className="text-foreground">
                  <Link to={isTrainer ? "/app" : "/9fit/hub"}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="text-foreground"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild className="text-foreground">
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link to="/auth">Começar Agora</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
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
              className="block text-foreground hover:text-primary transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Início
            </Link>
            <Link 
              to="/sales" 
              className="block text-foreground hover:text-primary transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Planos
            </Link>
            <Link 
              to="/assessment" 
              className="block text-foreground hover:text-primary transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Avaliação
            </Link>
            {user ? (
              <>
                <Link 
                  to={isTrainer ? "/app" : "/9fit/hub"} 
                  className="block text-foreground hover:text-primary transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button 
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left text-foreground hover:text-primary transition-colors font-medium"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/auth" 
                  className="block text-foreground hover:text-primary transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Entrar
                </Link>
                <Link 
                  to="/auth" 
                  className="block text-primary font-semibold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Começar Agora
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
