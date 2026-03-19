import { useMemo } from 'react';
import { differenceInDays, format, startOfMonth, subMonths } from 'date-fns';
import { useContratos } from './useContratos';

export interface DashboardStats {
  totalContratos: number;
  contratosActivos: number;
  contratosExpirar30Dias: number;
  contratosExpirar60Dias: number;
  contratosExpirar90Dias: number;
  valorTotalContratos: number;
  valorAnualRecorrente: number;
  contratosPorEstado: Record<string, number>;
  contratosPorTipo: Record<string, number>;
  contratosPorDepartamento: Record<string, number>;
  contratosPorMes: { month: string; criados: number; expirados: number }[];
  renovacaoStats: { automatica: number; manual: number; semRenovacao: number };
  duracaoStats: { determinado: number; indeterminado: number };
}

export interface ExpirationItem {
  id: string;
  titulo: string;
  tipo: string;
  dataTermo: string;
  diasRestantes: number;
  valor: number | null;
  renovacao: string | null;
  contraparte: string | null;
}

export const useDashboardStats = () => {
  const { contratos, isLoading, error } = useContratos();

  const stats = useMemo<DashboardStats>(() => {
    if (!contratos || contratos.length === 0) {
      return {
        totalContratos: 0,
        contratosActivos: 0,
        contratosExpirar30Dias: 0,
        contratosExpirar60Dias: 0,
        contratosExpirar90Dias: 0,
        valorTotalContratos: 0,
        valorAnualRecorrente: 0,
        contratosPorEstado: {},
        contratosPorTipo: {},
        contratosPorDepartamento: {},
        contratosPorMes: [],
        renovacaoStats: { automatica: 0, manual: 0, semRenovacao: 0 },
        duracaoStats: { determinado: 0, indeterminado: 0 },
      };
    }

    const now = new Date();
    const activeContratos = contratos.filter(c => !c.arquivado);

    // Count by estado
    const contratosPorEstado: Record<string, number> = {};
    activeContratos.forEach(c => {
      contratosPorEstado[c.estado_contrato] = (contratosPorEstado[c.estado_contrato] || 0) + 1;
    });

    // Count by tipo
    const contratosPorTipo: Record<string, number> = {};
    activeContratos.forEach(c => {
      contratosPorTipo[c.tipo_contrato] = (contratosPorTipo[c.tipo_contrato] || 0) + 1;
    });

    // Count by departamento
    const contratosPorDepartamento: Record<string, number> = {};
    activeContratos.forEach(c => {
      contratosPorDepartamento[c.departamento_responsavel] = (contratosPorDepartamento[c.departamento_responsavel] || 0) + 1;
    });

    // Count expiring contracts
    let contratosExpirar30Dias = 0;
    let contratosExpirar60Dias = 0;
    let contratosExpirar90Dias = 0;

    activeContratos.forEach(c => {
      if (c.data_termo && c.estado_contrato === 'activo') {
        const daysUntilExpiry = differenceInDays(new Date(c.data_termo), now);
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) contratosExpirar30Dias++;
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 60) contratosExpirar60Dias++;
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 90) contratosExpirar90Dias++;
      }
    });

    // Calculate total values
    const valorTotalContratos = activeContratos.reduce((sum, c) => sum + (c.valor_total_estimado || 0), 0);
    const valorAnualRecorrente = activeContratos.reduce((sum, c) => sum + (c.valor_anual_recorrente || 0), 0);

    // Contracts by month (last 12 months)
    const contratosPorMes: { month: string; criados: number; expirados: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthKey = format(monthStart, 'yyyy-MM');
      const monthLabel = format(monthStart, 'MMM yy');
      const criados = activeContratos.filter(c => c.created_at && format(new Date(c.created_at), 'yyyy-MM') === monthKey).length;
      const expirados = activeContratos.filter(c =>
        c.data_termo && format(new Date(c.data_termo), 'yyyy-MM') === monthKey &&
        (c.estado_contrato === 'expirado' || c.estado_contrato === 'rescindido' || c.estado_contrato === 'denunciado')
      ).length;
      contratosPorMes.push({ month: monthLabel, criados, expirados });
    }

    // Renewal stats (active contracts only)
    const activos = activeContratos.filter(c => c.estado_contrato === 'activo');
    const renovacaoStats = {
      automatica: activos.filter(c => c.tipo_renovacao === 'renovacao_automatica').length,
      manual: activos.filter(c => c.tipo_renovacao === 'renovacao_mediante_acordo').length,
      semRenovacao: activos.filter(c => c.tipo_renovacao === 'sem_renovacao_automatica').length,
    };

    // Duration stats
    const duracaoStats = {
      determinado: activos.filter(c => c.tipo_duracao === 'prazo_determinado').length,
      indeterminado: activos.filter(c => c.tipo_duracao === 'prazo_indeterminado').length,
    };

    return {
      totalContratos: activeContratos.length,
      contratosActivos: contratosPorEstado['activo'] || 0,
      contratosExpirar30Dias,
      contratosExpirar60Dias,
      contratosExpirar90Dias,
      valorTotalContratos,
      valorAnualRecorrente,
      contratosPorEstado,
      contratosPorTipo,
      contratosPorDepartamento,
      contratosPorMes,
      renovacaoStats,
      duracaoStats,
    };
  }, [contratos]);

  // Contracts expiring soon (90 days)
  const contratosAExpirar = useMemo(() => {
    if (!contratos) return [];

    const now = new Date();
    return contratos
      .filter(c => {
        if (c.arquivado || c.estado_contrato !== 'activo' || !c.data_termo) return false;
        const daysUntilExpiry = differenceInDays(new Date(c.data_termo), now);
        return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
      })
      .sort((a, b) => {
        const daysA = a.data_termo ? differenceInDays(new Date(a.data_termo), now) : Infinity;
        const daysB = b.data_termo ? differenceInDays(new Date(b.data_termo), now) : Infinity;
        return daysA - daysB;
      });
  }, [contratos]);

  // Expiration pipeline (180 days) with renewal info
  const expirationPipeline = useMemo<ExpirationItem[]>(() => {
    if (!contratos) return [];

    const now = new Date();
    return contratos
      .filter(c => !c.arquivado && c.estado_contrato === 'activo' && c.data_termo)
      .map(c => ({
        id: c.id,
        titulo: c.titulo_contrato,
        tipo: c.tipo_contrato,
        dataTermo: c.data_termo!,
        diasRestantes: differenceInDays(new Date(c.data_termo!), now),
        valor: c.valor_total_estimado,
        renovacao: c.tipo_renovacao,
        contraparte: c.parte_b_nome_legal,
      }))
      .filter(c => c.diasRestantes > 0 && c.diasRestantes <= 180)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [contratos]);

  return {
    stats,
    contratos: contratos || [],
    contratosAExpirar,
    expirationPipeline,
    isLoading,
    error,
  };
};
