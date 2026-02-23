import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
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
      };
    }

    const now = new Date();
    
    // Filter out archived contracts
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
    };
  }, [contratos]);

  // Get contracts expiring soon for the list
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

  return {
    stats,
    contratos: contratos || [],
    contratosAExpirar,
    isLoading,
    error,
  };
};
