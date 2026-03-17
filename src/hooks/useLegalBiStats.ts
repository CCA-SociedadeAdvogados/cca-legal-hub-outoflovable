import { useMemo } from 'react';
import { differenceInDays, format, startOfMonth, subMonths } from 'date-fns';
import { useContratos } from '@/hooks/useContratos';
import { useImpactos } from '@/hooks/useImpactos';
import { useEventosLegislativos } from '@/hooks/useEventosLegislativos';
import { useFinanceiro } from '@/hooks/useFinanceiro';

export interface PortfolioStats {
  totalContratos: number;
  contratosActivos: number;
  contratosExpirar30: number;
  contratosExpirar60: number;
  contratosExpirar90: number;
  valorTotalCarteira: number;
  valorAnualRecorrente: number;
  contratosPorEstado: { name: string; value: number; key: string }[];
  contratosPorTipo: { name: string; value: number; key: string }[];
  contratosPorDepartamento: { name: string; value: number; key: string }[];
  contratosPorMes: { month: string; criados: number; expirados: number }[];
  rgpdStats: {
    comDadosPessoais: number;
    semDadosPessoais: number;
    comDPA: number;
    comDPIA: number;
    transferenciaInternacional: number;
  };
  renovacaoStats: {
    automatica: number;
    manual: number;
    semRenovacao: number;
  };
  duracaoStats: {
    determinado: number;
    indeterminado: number;
  };
}

export interface ComplianceStats {
  totalImpactos: number;
  impactosAlto: number;
  impactosMedio: number;
  impactosBaixo: number;
  impactosPendentes: number;
  impactosEmTratamento: number;
  impactosResolvidos: number;
  totalEventos: number;
  eventosActivos: number;
  eventosPorArea: { name: string; value: number }[];
  eventosPorJurisdicao: { name: string; value: number }[];
  impactosPorEstado: { name: string; value: number; color: string }[];
}

export interface FinancialStats {
  totalPendente: number;
  totalVencido: number;
  totalAVencer: number;
  totalDocumentos: number;
  faturasVencidas: number;
  faturasAVencer: number;
  statusConta: string;
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

export interface LegalBiData {
  portfolio: PortfolioStats;
  compliance: ComplianceStats;
  financial: FinancialStats;
  expirations: ExpirationItem[];
  isLoading: boolean;
}

const ESTADO_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  em_aprovacao: 'Em Aprovação',
  enviado_para_assinatura: 'Para Assinatura',
  activo: 'Activo',
  expirado: 'Expirado',
  denunciado: 'Denunciado',
  rescindido: 'Rescindido',
};

const TIPO_LABELS: Record<string, string> = {
  nda: 'NDA',
  prestacao_servicos: 'Prestação Serviços',
  fornecimento: 'Fornecimento',
  saas: 'SaaS',
  arrendamento: 'Arrendamento',
  trabalho: 'Trabalho',
  licenciamento: 'Licenciamento',
  parceria: 'Parceria',
  consultoria: 'Consultoria',
  outro: 'Outro',
};

const DEPT_LABELS: Record<string, string> = {
  comercial: 'Comercial',
  operacoes: 'Operações',
  it: 'IT',
  rh: 'RH',
  financeiro: 'Financeiro',
  juridico: 'Jurídico',
  marketing: 'Marketing',
  outro: 'Outro',
};

const AREA_LABELS: Record<string, string> = {
  laboral: 'Laboral',
  fiscal: 'Fiscal',
  comercial: 'Comercial',
  protecao_dados: 'Proteção Dados',
  ambiente: 'Ambiente',
  seguranca_trabalho: 'Seg. Trabalho',
  societario: 'Societário',
  outro: 'Outro',
};

const JURISDICAO_LABELS: Record<string, string> = {
  nacional: 'Nacional',
  europeia: 'Europeia',
  internacional: 'Internacional',
};

export function useLegalBiStats(): LegalBiData {
  const { contratos, isLoading: isLoadingContratos } = useContratos();
  const { impactos, isLoading: isLoadingImpactos, stats: impactoStats } = useImpactos();
  const { eventos, isLoading: isLoadingEventos } = useEventosLegislativos();
  const { financialSummary, financialItems, isLoading: isLoadingFinanceiro } = useFinanceiro();

  const portfolio = useMemo<PortfolioStats>(() => {
    const list = contratos?.filter(c => !c.arquivado) ?? [];
    const now = new Date();

    // By estado
    const byEstado: Record<string, number> = {};
    list.forEach(c => { byEstado[c.estado_contrato] = (byEstado[c.estado_contrato] || 0) + 1; });

    // By tipo
    const byTipo: Record<string, number> = {};
    list.forEach(c => { byTipo[c.tipo_contrato] = (byTipo[c.tipo_contrato] || 0) + 1; });

    // By departamento
    const byDept: Record<string, number> = {};
    list.forEach(c => { byDept[c.departamento_responsavel] = (byDept[c.departamento_responsavel] || 0) + 1; });

    // Expiring
    let exp30 = 0, exp60 = 0, exp90 = 0;
    list.forEach(c => {
      if (c.data_termo && c.estado_contrato === 'activo') {
        const days = differenceInDays(new Date(c.data_termo), now);
        if (days > 0 && days <= 30) exp30++;
        if (days > 0 && days <= 60) exp60++;
        if (days > 0 && days <= 90) exp90++;
      }
    });

    // Contracts by month (last 12 months)
    const months: { month: string; criados: number; expirados: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthKey = format(monthStart, 'yyyy-MM');
      const monthLabel = format(monthStart, 'MMM yy');
      const criados = list.filter(c => c.created_at && format(new Date(c.created_at), 'yyyy-MM') === monthKey).length;
      const expirados = list.filter(c => c.data_termo && format(new Date(c.data_termo), 'yyyy-MM') === monthKey && (c.estado_contrato === 'expirado' || c.estado_contrato === 'rescindido' || c.estado_contrato === 'denunciado')).length;
      months.push({ month: monthLabel, criados, expirados });
    }

    // RGPD
    const activeList = list.filter(c => c.estado_contrato === 'activo');
    const rgpdStats = {
      comDadosPessoais: activeList.filter(c => c.tratamento_dados_pessoais).length,
      semDadosPessoais: activeList.filter(c => !c.tratamento_dados_pessoais).length,
      comDPA: activeList.filter(c => c.existe_dpa_anexo_rgpd).length,
      comDPIA: activeList.filter(c => c.dpia_realizada).length,
      transferenciaInternacional: activeList.filter(c => c.transferencia_internacional).length,
    };

    // Renovação
    const renovacaoStats = {
      automatica: activeList.filter(c => c.tipo_renovacao === 'renovacao_automatica').length,
      manual: activeList.filter(c => c.tipo_renovacao === 'renovacao_mediante_acordo').length,
      semRenovacao: activeList.filter(c => c.tipo_renovacao === 'sem_renovacao_automatica').length,
    };

    // Duração
    const duracaoStats = {
      determinado: activeList.filter(c => c.tipo_duracao === 'prazo_determinado').length,
      indeterminado: activeList.filter(c => c.tipo_duracao === 'prazo_indeterminado').length,
    };

    return {
      totalContratos: list.length,
      contratosActivos: byEstado['activo'] || 0,
      contratosExpirar30: exp30,
      contratosExpirar60: exp60,
      contratosExpirar90: exp90,
      valorTotalCarteira: list.reduce((s, c) => s + (c.valor_total_estimado || 0), 0),
      valorAnualRecorrente: list.reduce((s, c) => s + (c.valor_anual_recorrente || 0), 0),
      contratosPorEstado: Object.entries(byEstado).map(([key, value]) => ({ name: ESTADO_LABELS[key] || key, value, key })),
      contratosPorTipo: Object.entries(byTipo).map(([key, value]) => ({ name: TIPO_LABELS[key] || key, value, key })),
      contratosPorDepartamento: Object.entries(byDept).map(([key, value]) => ({ name: DEPT_LABELS[key] || key, value, key })),
      contratosPorMes: months,
      rgpdStats,
      renovacaoStats,
      duracaoStats,
    };
  }, [contratos]);

  const compliance = useMemo<ComplianceStats>(() => {
    const impList = impactos ?? [];
    const evtList = eventos ?? [];

    // Eventos por area
    const byArea: Record<string, number> = {};
    evtList.forEach(e => { byArea[e.area_direito] = (byArea[e.area_direito] || 0) + 1; });

    // Eventos por jurisdicao
    const byJuris: Record<string, number> = {};
    evtList.forEach(e => { byJuris[e.jurisdicao] = (byJuris[e.jurisdicao] || 0) + 1; });

    // Impactos por estado
    const byEstado: Record<string, number> = {};
    impList.forEach(i => { byEstado[i.estado] = (byEstado[i.estado] || 0) + 1; });

    const estadoColors: Record<string, string> = {
      pendente_analise: 'hsl(38, 92%, 50%)',
      em_tratamento: 'hsl(200, 98%, 39%)',
      resolvido: 'hsl(142, 71%, 45%)',
      ignorado: 'hsl(220, 14%, 60%)',
    };

    const estadoLabels: Record<string, string> = {
      pendente_analise: 'Pendente',
      em_tratamento: 'Em Tratamento',
      resolvido: 'Resolvido',
      ignorado: 'Ignorado',
    };

    return {
      totalImpactos: impactoStats.total,
      impactosAlto: impactoStats.alto,
      impactosMedio: impactoStats.medio,
      impactosBaixo: impactoStats.baixo,
      impactosPendentes: impactoStats.pendentes,
      impactosEmTratamento: impactoStats.emTratamento,
      impactosResolvidos: impList.filter(i => i.estado === 'resolvido').length,
      totalEventos: evtList.length,
      eventosActivos: evtList.filter(e => e.estado === 'activo').length,
      eventosPorArea: Object.entries(byArea).map(([key, value]) => ({ name: AREA_LABELS[key] || key, value })),
      eventosPorJurisdicao: Object.entries(byJuris).map(([key, value]) => ({ name: JURISDICAO_LABELS[key] || key, value })),
      impactosPorEstado: Object.entries(byEstado).map(([key, value]) => ({
        name: estadoLabels[key] || key,
        value,
        color: estadoColors[key] || 'hsl(220, 14%, 60%)',
      })),
    };
  }, [impactos, eventos, impactoStats]);

  const financial = useMemo<FinancialStats>(() => {
    const items = financialItems ?? [];
    return {
      totalPendente: Number(financialSummary?.total_pendente ?? 0),
      totalVencido: Number(financialSummary?.total_vencido ?? 0),
      totalAVencer: Number(financialSummary?.total_a_vencer ?? 0),
      totalDocumentos: Number(financialSummary?.total_documentos ?? 0),
      faturasVencidas: items.filter(i => i.estado === 'vencido').length,
      faturasAVencer: items.filter(i => i.estado === 'a_vencer').length,
      statusConta: !financialSummary || Number(financialSummary.total_pendente ?? 0) <= 0
        ? 'em_dia'
        : Number(financialSummary.total_vencido ?? 0) > 0
          ? 'em_incumprimento'
          : 'em_aberto',
    };
  }, [financialSummary, financialItems]);

  const expirations = useMemo<ExpirationItem[]>(() => {
    const now = new Date();
    return (contratos ?? [])
      .filter(c => !c.arquivado && c.estado_contrato === 'activo' && c.data_termo)
      .map(c => {
        const dias = differenceInDays(new Date(c.data_termo!), now);
        return {
          id: c.id,
          titulo: c.titulo_contrato,
          tipo: c.tipo_contrato,
          dataTermo: c.data_termo!,
          diasRestantes: dias,
          valor: c.valor_total_estimado,
          renovacao: c.tipo_renovacao,
          contraparte: c.parte_b_nome_legal,
        };
      })
      .filter(c => c.diasRestantes > 0 && c.diasRestantes <= 180)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [contratos]);

  return {
    portfolio,
    compliance,
    financial,
    expirations,
    isLoading: isLoadingContratos || isLoadingImpactos || isLoadingEventos || isLoadingFinanceiro,
  };
}
