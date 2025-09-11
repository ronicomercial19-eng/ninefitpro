import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  ArrowUpDown, 
  Calendar,
  ChevronLeft,
  MoreHorizontal,
  Download
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ListItem {
  id: string;
  name: string;
  status: 'ativo' | 'inativo' | 'concluido' | 'pendente';
  type: 'aluno' | 'treino' | 'conteudo' | 'evento';
  date: string;
  category?: string;
  actions: string[];
}

type SortField = 'name' | 'status' | 'date' | 'type';
type SortDirection = 'asc' | 'desc';

export default function ListOverviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contentId = searchParams.get('content');
  
  const [items, setItems] = useState<ListItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [loading, setLoading] = useState(true);

  const sampleItems: ListItem[] = [
    {
      id: '1',
      name: 'João Silva',
      status: 'ativo',
      type: 'aluno',
      date: '2024-01-15',
      actions: ['view', 'edit', 'delete']
    },
    {
      id: '2',
      name: 'Maria Santos',
      status: 'ativo',
      type: 'aluno',
      date: '2024-01-14',
      actions: ['view', 'edit', 'delete']
    },
    {
      id: '3',
      name: 'HIIT Cardio Intenso',
      status: 'concluido',
      type: 'treino',
      date: '2024-01-13',
      category: 'Cardio',
      actions: ['view', 'edit']
    },
    {
      id: '4',
      name: 'Yoga Relaxante',
      status: 'ativo',
      type: 'treino',
      date: '2024-01-12',
      category: 'Yoga',
      actions: ['view', 'edit', 'duplicate']
    },
    {
      id: '5',
      name: 'Consulta Nutricional',
      status: 'pendente',
      type: 'evento',
      date: '2024-01-20',
      actions: ['view', 'edit', 'cancel']
    },
    {
      id: '6',
      name: 'Plano Nutricional Completo',
      status: 'ativo',
      type: 'conteudo',
      date: '2024-01-11',
      category: 'Nutrição',
      actions: ['view', 'edit', 'download']
    }
  ];

  useEffect(() => {
    // Simulate loading items
    setTimeout(() => {
      setItems(sampleItems);
      setFilteredItems(sampleItems);
      setLoading(false);
    }, 800);
  }, []);

  useEffect(() => {
    filterAndSortItems();
  }, [searchTerm, statusFilter, typeFilter, sortField, sortDirection, items]);

  const filterAndSortItems = () => {
    let filtered = items;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredItems(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ativo: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      inativo: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      concluido: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    };

    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      aluno: '👤',
      treino: '💪',
      conteudo: '📄',
      evento: '📅'
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  const handleAction = (action: string, item: ListItem) => {
    switch (action) {
      case 'view':
        if (item.type === 'aluno') {
          navigate(`/area-do-aluno?id=${item.id}`);
        } else {
          navigate(`/calendario?item=${item.id}`);
        }
        break;
      case 'edit':
        toast.info(`Editando: ${item.name}`);
        break;
      case 'delete':
        toast.error(`Deletando: ${item.name}`);
        break;
      case 'download':
        toast.success(`Baixando: ${item.name}`);
        break;
      default:
        toast.info(`Ação: ${action} - ${item.name}`);
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Visão Geral da Lista</h1>
            <p className="text-muted-foreground">
              Gerencie e organize todos os seus itens em um só lugar
            </p>
          </div>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros e Busca</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por nome ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background text-foreground"
                >
                  <option value="all">Todos os Status</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="concluido">Concluído</option>
                  <option value="pendente">Pendente</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background text-foreground"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="aluno">Alunos</option>
                  <option value="treino">Treinos</option>
                  <option value="conteudo">Conteúdos</option>
                  <option value="evento">Eventos</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-muted-foreground">
            Mostrando {filteredItems.length} de {items.length} itens
          </p>
          <Link to="/calendario">
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4" />
              Ver no Calendário
            </Button>
          </Link>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Tipo</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('name')}
                  >
                    Nome
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('date')}
                  >
                    Data
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell>
                    <span className="text-lg">{getTypeIcon(item.type)}</span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.name}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.status)}
                  </TableCell>
                  <TableCell>
                    {new Date(item.date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {item.category ? (
                      <Badge variant="outline">{item.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {item.actions.map((action) => (
                          <DropdownMenuItem 
                            key={action}
                            onClick={() => handleAction(action, item)}
                          >
                            {action === 'view' && <Eye className="mr-2 h-4 w-4" />}
                            {action === 'edit' && <Edit className="mr-2 h-4 w-4" />}
                            {action === 'delete' && <Trash2 className="mr-2 h-4 w-4" />}
                            {action === 'download' && <Download className="mr-2 h-4 w-4" />}
                            {action.charAt(0).toUpperCase() + action.slice(1)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum item encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Tente ajustar seus filtros ou termo de busca
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}