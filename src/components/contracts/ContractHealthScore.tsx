import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertTriangle, Heart } from 'lucide-react';
import type { Contrato } from '@/hooks/useContratos';

interface HealthCheck {
  key: string;
  label: string;
  passed: boolean;
  weight: number;
}

function computeHealthChecks(contrato: Contrato, t: (key: string, fallback?: string) => string): HealthCheck[] {
  return [
    {
      key: 'titulo',
      label: t('healthScore.hasTitle', 'Título preenchido'),
      passed: !!contrato.titulo_contrato?.trim(),
      weight: 1,
    },
    {
      key: 'tipo',
      label: t('healthScore.hasType', 'Tipo de contrato definido'),
      passed: !!contrato.tipo_contrato && contrato.tipo_contrato !== 'outro',
      weight: 1,
    },
    {
      key: 'partes',
      label: t('healthScore.hasParties', 'Partes contratantes identificadas'),
      passed: !!contrato.parte_a_nome_legal && !!contrato.parte_b_nome_legal,
      weight: 2,
    },
    {
      key: 'datas',
      label: t('healthScore.hasDates', 'Datas de vigência definidas'),
      passed: !!contrato.data_inicio_vigencia,
      weight: 2,
    },
    {
      key: 'valor',
      label: t('healthScore.hasValue', 'Valor definido'),
      passed: (contrato.valor_total_estimado ?? 0) > 0,
      weight: 1,
    },
    {
      key: 'renovacao',
      label: t('healthScore.hasRenewal', 'Tipo de renovação configurado'),
      passed: !!contrato.tipo_renovacao,
      weight: 1,
    },
    {
      key: 'dpa',
      label: t('healthScore.hasDPA', 'DPA/RGPD verificado'),
      passed: contrato.tratamento_dados_pessoais ? contrato.existe_dpa_anexo_rgpd : true,
      weight: 2,
    },
    {
      key: 'assinatura',
      label: t('healthScore.hasSigned', 'Assinatura registada'),
      passed: !!contrato.data_assinatura_parte_a || !!contrato.data_assinatura_parte_b,
      weight: 1,
    },
    {
      key: 'departamento',
      label: t('healthScore.hasDepartment', 'Departamento atribuído'),
      passed: !!contrato.departamento_responsavel,
      weight: 1,
    },
    {
      key: 'objeto',
      label: t('healthScore.hasObject', 'Objecto descrito'),
      passed: !!contrato.objeto_resumido?.trim(),
      weight: 1,
    },
  ];
}

export function ContractHealthScore({ contrato }: { contrato: Contrato }) {
  const { t } = useTranslation();

  const { checks, score, maxScore, percentage } = useMemo(() => {
    const checks = computeHealthChecks(contrato, t);
    const maxScore = checks.reduce((s, c) => s + c.weight, 0);
    const score = checks.filter(c => c.passed).reduce((s, c) => s + c.weight, 0);
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return { checks, score, maxScore, percentage };
  }, [contrato, t]);

  const variant = percentage >= 80 ? 'success' : percentage >= 50 ? 'warning' : 'danger';
  const colorClass = variant === 'success' ? 'text-emerald-600' : variant === 'warning' ? 'text-amber-500' : 'text-red-500';
  const progressColor = variant === 'success' ? 'bg-emerald-500' : variant === 'warning' ? 'bg-amber-500' : 'bg-red-500';
  const label = variant === 'success'
    ? t('healthScore.good', 'Bom')
    : variant === 'warning'
      ? t('healthScore.attention', 'Atenção')
      : t('healthScore.incomplete', 'Incompleto');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Heart className="h-4 w-4" />
          {t('healthScore.title', 'Saúde do Contrato')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={`text-3xl font-bold ${colorClass}`}>{percentage}%</div>
          <div className="flex-1">
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${percentage}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <Badge variant={variant === 'success' ? 'active' : variant === 'warning' ? 'default' : 'destructive'} className="text-xs">
                {label}
              </Badge>
              <span className="text-xs text-muted-foreground">{score}/{maxScore}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          {checks.map((check) => (
            <div key={check.key} className="flex items-center gap-2 text-sm">
              {check.passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              )}
              <span className={check.passed ? 'text-muted-foreground' : 'font-medium'}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
