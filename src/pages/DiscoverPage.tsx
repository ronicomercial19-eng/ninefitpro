import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  Play, 
  Clock, 
  Star, 
  Bookmark,
  ArrowRight,
  ChevronLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiscoverContent {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  image_url?: string;
  content_type: 'video' | 'article' | 'workout' | 'nutrition';
  rating: number;
  views: number;
}

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<DiscoverContent[]>([]);
  const [filteredContents, setFilteredContents] = useState<DiscoverContent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'all', name: 'Todos' },
    { id: 'workout', name: 'Treinos' },
    { id: 'nutrition', name: 'Nutrição' },
    { id: 'video', name: 'Vídeos' },
    { id: 'article', name: 'Artigos' }
  ];

  const sampleContents: DiscoverContent[] = [
    {
      id: '1',
      title: 'HIIT Cardio Intenso',
      description: 'Treino de alta intensidade para queimar gordura rapidamente e melhorar o condicionamento físico.',
      category: 'workout',
      duration: '25 min',
      difficulty: 'Intermediário',
      content_type: 'workout',
      rating: 4.8,
      views: 1250,
      image_url: '/lovable-uploads/1b2f13a6-2280-47a3-ad8d-79c6dbb74994.png'
    },
    {
      id: '2',
      title: 'Yoga Relaxante',
      description: 'Sequência de yoga para relaxamento e alívio do estresse do dia a dia.',
      category: 'workout',
      duration: '45 min',
      difficulty: 'Iniciante',
      content_type: 'video',
      rating: 4.9,
      views: 892,
      image_url: '/lovable-uploads/4849dd0e-4880-4fa7-b874-b549ee92d6d6.png'
    },
    {
      id: '3',
      title: 'Plano Nutricional Completo',
      description: 'Guia completo de alimentação saudável com receitas e dicas práticas.',
      category: 'nutrition',
      duration: 'Leitura 15 min',
      difficulty: 'Iniciante',
      content_type: 'article',
      rating: 4.7,
      views: 634,
      image_url: '/lovable-uploads/50c7d2be-e22b-4cac-b456-e0a80c7180f6.png'
    },
    {
      id: '4',
      title: 'Treino de Força Funcional',
      description: 'Exercícios funcionais para melhorar a força e coordenação.',
      category: 'workout',
      duration: '35 min',
      difficulty: 'Avançado',
      content_type: 'workout',
      rating: 4.6,
      views: 1100,
      image_url: '/lovable-uploads/84d10bda-c9d1-45f2-bea0-11a422b00b03.png'
    },
    {
      id: '5',
      title: 'Pilates para Iniciantes',
      description: 'Introdução ao pilates com exercícios básicos e técnicas fundamentais.',
      category: 'workout',
      duration: '30 min',
      difficulty: 'Iniciante',
      content_type: 'video',
      rating: 4.8,
      views: 756,
      image_url: '/lovable-uploads/9457d547-5873-496e-9a50-e6af7215946a.png'
    },
    {
      id: '6',
      title: 'Receitas Pós-Treino',
      description: 'Deliciosas receitas ricas em proteína para recuperação muscular.',
      category: 'nutrition',
      duration: 'Leitura 10 min',
      difficulty: 'Iniciante',
      content_type: 'article',
      rating: 4.5,
      views: 423,
      image_url: '/lovable-uploads/98b1ae85-067d-447c-bfaf-aedc3a6dc8de.png'
    }
  ];

  useEffect(() => {
    // Simulate loading content
    setTimeout(() => {
      setContents(sampleContents);
      setFilteredContents(sampleContents);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    filterContents();
  }, [searchTerm, selectedCategory, contents]);

  const filterContents = () => {
    let filtered = contents;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(content => content.content_type === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(content =>
        content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        content.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredContents(filtered);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Iniciante':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Intermediário':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Avançado':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play className="w-4 h-4" />;
      case 'workout':
        return <Clock className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Descobrir</h1>
            <p className="text-muted-foreground">
              Explore novos conteúdos e expanda seus conhecimentos
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar conteúdos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="whitespace-nowrap"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContents.map((content) => (
            <Card 
              key={content.id} 
              className="hover:shadow-lg transition-all duration-300 group cursor-pointer"
              onClick={() => navigate(`/visao-geral-da-lista?content=${content.id}`)}
            >
              {/* Content Image */}
              <div className="relative overflow-hidden rounded-t-lg">
                <img
                  src={content.image_url || '/placeholder.svg'}
                  alt={content.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <Badge className={getDifficultyColor(content.difficulty)}>
                    {content.difficulty}
                  </Badge>
                </div>
                <div className="absolute top-3 right-3">
                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                    <Bookmark className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  {getTypeIcon(content.content_type)}
                  <span>{content.duration}</span>
                </div>
              </div>

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                    {content.title}
                  </CardTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{content.rating}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                  {content.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {content.views.toLocaleString()} visualizações
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredContents.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum conteúdo encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Tente ajustar seus filtros ou termo de busca
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        )}

        {/* Load More Button */}
        {filteredContents.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg">
              Carregar Mais Conteúdos
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}