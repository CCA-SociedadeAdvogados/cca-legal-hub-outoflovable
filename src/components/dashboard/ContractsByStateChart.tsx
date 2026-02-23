import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ESTADO_CONTRATO_LABELS } from '@/types/contracts';

interface ContractsByStateChartProps {
  data: Record<string, number>;
}

const STATE_COLORS: Record<string, string> = {
  rascunho: 'hsl(220, 14%, 60%)',
  em_revisao: 'hsl(38, 92%, 50%)',
  em_aprovacao: 'hsl(262, 83%, 58%)',
  enviado_para_assinatura: 'hsl(200, 98%, 39%)',
  activo: 'hsl(142, 71%, 45%)',
  expirado: 'hsl(0, 84%, 60%)',
  denunciado: 'hsl(0, 84%, 40%)',
  rescindido: 'hsl(0, 0%, 45%)',
};

export function ContractsByStateChart({ data }: ContractsByStateChartProps) {
  const chartData = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([estado, value]) => ({
      name: ESTADO_CONTRATO_LABELS[estado as keyof typeof ESTADO_CONTRATO_LABELS] || estado,
      value,
      color: STATE_COLORS[estado] || 'hsl(220, 14%, 60%)',
    }));

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contratos por Estado</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">Sem dados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contratos por Estado</CardTitle>
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
                formatter={(value: number) => [`${value} contratos`, '']}
              />
              <Legend
                verticalAlign="bottom"
                formatter={(value) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
