import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSuccessMetrics } from "@/hooks/useSuccessMetrics";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Users,
  TrendingUp,
  Clock,
  Heart,
  Target,
  Award,
  RefreshCw
} from "lucide-react";

export function SuccessMetricsPanel() {
  const { metrics, loading, refreshMetrics } = useSuccessMetrics();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <LoadingSpinner size="lg" label="Carregando métricas..." />
        </CardContent>
      </Card>
    );
  }

  const metricCards = [
    {
      title: "Usuários Ativos",
      icon: <Users className="w-5 h-5" />,
      metrics: [
        { label: "Diário", value: metrics.dailyActiveUsers },
        { label: "Semanal", value: metrics.weeklyActiveUsers },
        { label: "Mensal", value: metrics.monthlyActiveUsers }
      ],
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Performance",
      icon: <Target className="w-5 h-5" />,
      metrics: [
        { label: "Taxa Conclusão", value: `${metrics.completionRate.toFixed(1)}%` },
        { label: "Taxa Retenção", value: `${metrics.retentionRate}%` },
        { label: "Sessão Média", value: `${metrics.averageSessionDuration}min` }
      ],
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Crescimento",
      icon: <TrendingUp className="w-5 h-5" />,
      metrics: [
        { label: "Novos (Semana)", value: metrics.newUsersThisWeek },
        { label: "Novos (Mês)", value: metrics.newUsersThisMonth },
        { label: "Taxa Crescimento", value: `${metrics.growthRate.toFixed(1)}%` }
      ],
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Satisfação",
      icon: <Heart className="w-5 h-5" />,
      metrics: [
        { label: "Avaliação Média", value: metrics.averageRating.toFixed(1) },
        { label: "NPS Score", value: metrics.npsScore },
        { label: "Tempo Resposta", value: `${metrics.supportResponseTime}h` }
      ],
      color: "text-red-600",
      bgColor: "bg-red-50"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Métricas de Sucesso
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe KPIs de usabilidade, engajamento e performance
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshMetrics}
          className="hover:bg-primary/10 hover:border-primary transition-all"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, index) => (
          <Card
            key={card.title}
            className="hover:shadow-lg transition-all duration-300 group animate-in fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor} ${card.color} group-hover:scale-110 transition-transform`}>
                  {card.icon}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {card.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs text-muted-foreground">
                    {metric.label}
                  </span>
                  <Badge variant="secondary" className="font-semibold">
                    {metric.value}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {metrics.completionRate.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Taxa de Conclusão Geral
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {metrics.retentionRate}%
              </div>
              <div className="text-sm text-muted-foreground">
                Taxa de Retenção
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {metrics.npsScore}
              </div>
              <div className="text-sm text-muted-foreground">
                Net Promoter Score
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
