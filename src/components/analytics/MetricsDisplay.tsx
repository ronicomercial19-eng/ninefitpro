import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock,
  Users,
  Activity,
  Target
} from "lucide-react";

interface Metric {
  id: string;
  label: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: string;
}

interface MetricsDisplayProps {
  showDetailedMetrics?: boolean;
}

export function MetricsDisplay({ showDetailedMetrics = false }: MetricsDisplayProps) {
  const [metrics, setMetrics] = useState<Metric[]>([
    {
      id: 'active_users',
      label: 'Alunos Ativos',
      value: 45,
      change: 12,
      changeLabel: 'vs. mês anterior',
      icon: <Users className="w-5 h-5" />,
      color: 'text-green-600'
    },
    {
      id: 'completion_rate',
      label: 'Taxa de Conclusão',
      value: '87%',
      change: 5,
      changeLabel: 'vs. semana anterior',
      icon: <Target className="w-5 h-5" />,
      color: 'text-blue-600'
    },
    {
      id: 'avg_sessions',
      label: 'Sessões Médias/Semana',
      value: 4.2,
      change: -2,
      changeLabel: 'vs. média anterior',
      icon: <Activity className="w-5 h-5" />,
      color: 'text-purple-600'
    },
    {
      id: 'response_time',
      label: 'Tempo Resposta Médio',
      value: '2h 15min',
      change: -15,
      changeLabel: 'melhor que antes',
      icon: <Clock className="w-5 h-5" />,
      color: 'text-orange-600'
    }
  ]);

  const getChangeIcon = (change: number) => {
    return change > 0 ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

  const getChangeBadgeVariant = (change: number): "default" | "secondary" | "destructive" => {
    return change > 0 ? "default" : "destructive";
  };

  if (!showDetailedMetrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card 
            key={metric.id} 
            className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg bg-muted group-hover:scale-110 transition-transform ${metric.color}`}>
                  {metric.icon}
                </div>
                {getChangeIcon(metric.change)}
              </div>
              <div className="text-2xl font-bold mb-1">{metric.value}</div>
              <div className="text-xs text-muted-foreground">{metric.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => (
        <Card 
          key={metric.id}
          className="hover:shadow-lg transition-all duration-300 group cursor-pointer"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.label}
            </CardTitle>
            <div className={`p-2 rounded-lg bg-muted group-hover:scale-110 transition-transform ${metric.color}`}>
              {metric.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{metric.value}</div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={getChangeBadgeVariant(metric.change)}
                className="flex items-center gap-1"
              >
                {getChangeIcon(metric.change)}
                <span>{Math.abs(metric.change)}%</span>
              </Badge>
              <span className="text-xs text-muted-foreground">
                {metric.changeLabel}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
