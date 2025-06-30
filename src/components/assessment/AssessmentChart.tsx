
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts";

interface AssessmentChartProps {
  assessments: any[];
}

export const AssessmentChart = ({ assessments }: AssessmentChartProps) => {
  if (!assessments.length) return null;

  const latestAssessment = assessments[0];

  const comparisonData = [
    {
      name: "Superior - Puxar",
      antes: latestAssessment.upper_pull_before || 0,
      depois: latestAssessment.upper_pull_after || 0,
    },
    {
      name: "Superior - Empurrar",
      antes: latestAssessment.upper_push_before || 0,
      depois: latestAssessment.upper_push_after || 0,
    },
    {
      name: "Inferior - Puxar",
      antes: latestAssessment.lower_pull_before || 0,
      depois: latestAssessment.lower_pull_after || 0,
    },
    {
      name: "Inferior - Empurrar",
      antes: latestAssessment.lower_push_before || 0,
      depois: latestAssessment.lower_push_after || 0,
    },
    {
      name: "Core",
      antes: latestAssessment.core_resistance_before || 0,
      depois: latestAssessment.core_resistance_after || 0,
    },
  ];

  const chartConfig = {
    antes: {
      label: "Antes",
      color: "#f97316",
    },
    depois: {
      label: "Depois",
      color: "#16a34a",
    },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comparativo de Resistência Muscular</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="antes" fill="var(--color-antes)" name="Antes" />
                <Bar dataKey="depois" fill="var(--color-depois)" name="Depois" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {assessments.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolução ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={assessments.reverse()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="assessment_date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="upper_pull_after" 
                    stroke="var(--color-depois)" 
                    name="Superior - Puxar"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="core_resistance_after" 
                    stroke="var(--color-antes)" 
                    name="Core"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
