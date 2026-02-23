import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface RiskChartProps {
  data: {
    alto: number;
    medio: number;
    baixo: number;
  };
}

export function RiskChart({ data }: RiskChartProps) {
  const chartData = [
    { name: 'Alto', value: data.alto, color: 'hsl(0, 84%, 60%)' },
    { name: 'Médio', value: data.medio, color: 'hsl(38, 92%, 50%)' },
    { name: 'Baixo', value: data.baixo, color: 'hsl(142, 71%, 45%)' },
  ].filter(item => item.value > 0);

  const total = data.alto + data.medio + data.baixo;

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Impactos por Nível de Risco</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">Sem dados de impacto</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Impactos por Nível de Risco</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
                formatter={(value: number) => [`${value} impactos`, '']}
              />
              <Legend
                verticalAlign="bottom"
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-risk-high">{data.alto}</p>
            <p className="text-xs text-muted-foreground">Alto</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-risk-medium">{data.medio}</p>
            <p className="text-xs text-muted-foreground">Médio</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-risk-low">{data.baixo}</p>
            <p className="text-xs text-muted-foreground">Baixo</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
