import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form } from '@/components/ui/form';
import { ArrowLeft, Save, Loader2, FileText, Paperclip, Tags } from 'lucide-react';
import { ContractAttachments } from '@/components/contracts/ContractAttachments';
import { ContractComplianceAnalyzer } from '@/components/contracts/ContractComplianceAnalyzer';
import { ContractClassification } from '@/components/contracts/ContractClassification';
import { ContractInitialUpload } from '@/components/contracts/ContractInitialUpload';
import { useContratos, useContrato, type ContratoInsert } from '@/hooks/useContratos';
import type { Database } from '@/integrations/supabase/types';
import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';

type EstadoContrato = Database['public']['Enums']['estado_contrato'];
type TipoContrato = Database['public']['Enums']['tipo_contrato'];
type Departamento = Database['public']['Enums']['departamento'];
type TipoDuracao = Database['public']['Enums']['tipo_duracao'];
type TipoRenovacao = Database['public']['Enums']['tipo_renovacao'];
type TipoGarantia = Database['public']['Enums']['tipo_garantia'];
type PapelEntidade = Database['public']['Enums']['papel_entidade'];

interface ExtractedContractData {
  titulo_contrato?: string;
  tipo_contrato?: string;
  objeto_resumido?: string;
  parte_a_nome_legal?: string;
  parte_a_nif?: string;
  parte_a_morada?: string;
  parte_b_nome_legal?: string;
  parte_b_nif?: string;
  parte_b_morada?: string;
  data_assinatura?: string;
  data_inicio_vigencia?: string;
  data_termo?: string;
  tipo_duracao?: string;
  tipo_renovacao?: string;
  renovacao_periodo_meses?: number;
  aviso_denuncia_dias?: number;
  obrigacoes_parte_a?: string;
  obrigacoes_parte_b?: string;
  sla_indicadores?: string;
  clausulas_especiais?: {
    confidencialidade?: boolean;
    nao_concorrencia?: boolean;
    exclusividade?: boolean;
    subcontratacao?: boolean;
    protecao_dados?: boolean;
  };
}
import { contratoFormSchema, type ContratoFormValues } from '@/components/contracts/form/schema';
import { IdentificacaoTab } from '@/components/contracts/form/IdentificacaoTab';
import { PartesTab } from '@/components/contracts/form/PartesTab';
import { DatasTab } from '@/components/contracts/form/DatasTab';
import { ObrigacoesTab } from '@/components/contracts/form/ObrigacoesTab';
import { RgpdTab } from '@/components/contracts/form/RgpdTab';

export default function ContratoForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'novo';
  const { createContrato, updateContrato } = useContratos();
  const { isLocal } = useLegalHubProfile(); // true for org_user / org_manager (client users)
  const { user } = useAuth();

  // Use dedicated hook for fetching individual contract with fresh data
  const { data: existingContrato, isLoading: isLoadingContrato } = useContrato(
    isEditing ? id : undefined,
  );

  const [activeTab, setActiveTab] = useState('identificacao');
  const [showUploadStep, setShowUploadStep] = useState(true);
  const [_uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedContractText, setExtractedContractText] = useState<string>('');
  // triageResult removed — analysis done by external CCA agent

  const [classifiedAreas, setClassifiedAreas] = useState<string[]>(
    existingContrato?.areas_direito_aplicaveis || [],
  );

  // Function to generate internal ID
  const generateInternalId = () => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CTR-${year}-${random}`;
  };

  const form = useForm<ContratoFormValues>({
    resolver: zodResolver(contratoFormSchema),
    defaultValues: existingContrato
      ? {
          titulo_contrato: existingContrato.titulo_contrato,
          tipo_contrato: existingContrato.tipo_contrato,
          tipo_contrato_personalizado: existingContrato.tipo_contrato_personalizado || '',
          departamento_responsavel: existingContrato.departamento_responsavel,
          objeto_resumido: existingContrato.objeto_resumido || '',
          parte_a_nome_legal: existingContrato.parte_a_nome_legal,
          parte_a_nif: existingContrato.parte_a_nif || '',
          parte_a_morada: existingContrato.parte_a_morada || '',
          parte_a_pais: existingContrato.parte_a_pais || 'Portugal',
          parte_b_nome_legal: existingContrato.parte_b_nome_legal,
          parte_b_nif: existingContrato.parte_b_nif || '',
          parte_b_morada: existingContrato.parte_b_morada || '',
          parte_b_pais: existingContrato.parte_b_pais || 'Portugal',
          parte_b_grupo_economico: existingContrato.parte_b_grupo_economico || '',
          data_assinatura_parte_a: existingContrato.data_assinatura_parte_a
            ? new Date(existingContrato.data_assinatura_parte_a)
            : null,
          data_assinatura_parte_b: existingContrato.data_assinatura_parte_b
            ? new Date(existingContrato.data_assinatura_parte_b)
            : null,
          data_inicio_vigencia: existingContrato.data_inicio_vigencia
            ? new Date(existingContrato.data_inicio_vigencia)
            : null,
          data_termo: existingContrato.data_termo ? new Date(existingContrato.data_termo) : null,
          tipo_duracao: existingContrato.tipo_duracao,
          tipo_renovacao: existingContrato.tipo_renovacao,
          renovacao_periodo_meses: existingContrato.renovacao_periodo_meses,
          aviso_previo_nao_renovacao_dias: existingContrato.aviso_previo_nao_renovacao_dias || 30,
          obrigacoes_parte_a: existingContrato.obrigacoes_parte_a || '',
          obrigacoes_parte_b: existingContrato.obrigacoes_parte_b || '',
          sla_kpi_resumo: existingContrato.sla_kpi_resumo || '',
          limite_responsabilidade: existingContrato.limite_responsabilidade || '',
          clausula_indemnizacao: existingContrato.clausula_indemnizacao || false,
          clausula_indemnizacao_resumo: existingContrato.clausula_indemnizacao_resumo || '',
          flag_confidencialidade: existingContrato.flag_confidencialidade || false,
          flag_nao_concorrencia: existingContrato.flag_nao_concorrencia || false,
          flag_exclusividade: existingContrato.flag_exclusividade || false,
          flag_direito_subcontratar: existingContrato.flag_direito_subcontratar || false,
          garantia_existente: existingContrato.garantia_existente || false,
          garantia_tipo: existingContrato.garantia_tipo || '',
          garantia_valor: existingContrato.garantia_valor,
          garantia_data_validade: existingContrato.garantia_data_validade
            ? new Date(existingContrato.garantia_data_validade)
            : null,
          tratamento_dados_pessoais: existingContrato.tratamento_dados_pessoais || false,
          papel_entidade: existingContrato.papel_entidade || '',
          categorias_dados_pessoais: existingContrato.categorias_dados_pessoais || '',
          categorias_titulares: existingContrato.categorias_titulares || '',
          transferencia_internacional: existingContrato.transferencia_internacional || false,
          paises_transferencia: existingContrato.paises_transferencia || '',
          base_legal_transferencia: existingContrato.base_legal_transferencia || '',
          existe_dpa_anexo_rgpd: existingContrato.existe_dpa_anexo_rgpd || false,
          referencia_dpa: existingContrato.referencia_dpa || '',
          dpia_realizada: existingContrato.dpia_realizada || false,
          referencia_dpia: existingContrato.referencia_dpia || '',
        }
      : {
          titulo_contrato: '',
          tipo_contrato: 'prestacao_servicos',
          departamento_responsavel: 'outro',
          parte_a_nome_legal: 'Radar Conformidade, Lda.',
          parte_a_pais: 'Portugal',
          parte_b_nome_legal: '',
          parte_b_pais: 'Portugal',
          tipo_duracao: 'prazo_determinado',
          tipo_renovacao: 'sem_renovacao_automatica',
          aviso_previo_nao_renovacao_dias: 30,
        },
  });

  // Sync form when server data changes (for real-time updates between users)
  useEffect(() => {
    if (existingContrato && isEditing) {
      form.reset({
        titulo_contrato: existingContrato.titulo_contrato,
        tipo_contrato: existingContrato.tipo_contrato,
        tipo_contrato_personalizado: existingContrato.tipo_contrato_personalizado || '',
        departamento_responsavel: existingContrato.departamento_responsavel,
        objeto_resumido: existingContrato.objeto_resumido || '',
        parte_a_nome_legal: existingContrato.parte_a_nome_legal,
        parte_a_nif: existingContrato.parte_a_nif || '',
        parte_a_morada: existingContrato.parte_a_morada || '',
        parte_a_pais: existingContrato.parte_a_pais || 'Portugal',
        parte_b_nome_legal: existingContrato.parte_b_nome_legal,
        parte_b_nif: existingContrato.parte_b_nif || '',
        parte_b_morada: existingContrato.parte_b_morada || '',
        parte_b_pais: existingContrato.parte_b_pais || 'Portugal',
        parte_b_grupo_economico: existingContrato.parte_b_grupo_economico || '',
        data_assinatura_parte_a: existingContrato.data_assinatura_parte_a
          ? new Date(existingContrato.data_assinatura_parte_a)
          : null,
        data_assinatura_parte_b: existingContrato.data_assinatura_parte_b
          ? new Date(existingContrato.data_assinatura_parte_b)
          : null,
        data_inicio_vigencia: existingContrato.data_inicio_vigencia
          ? new Date(existingContrato.data_inicio_vigencia)
          : null,
        data_termo: existingContrato.data_termo ? new Date(existingContrato.data_termo) : null,
        tipo_duracao: existingContrato.tipo_duracao,
        tipo_renovacao: existingContrato.tipo_renovacao,
        renovacao_periodo_meses: existingContrato.renovacao_periodo_meses,
        aviso_previo_nao_renovacao_dias: existingContrato.aviso_previo_nao_renovacao_dias || 30,
        obrigacoes_parte_a: existingContrato.obrigacoes_parte_a || '',
        obrigacoes_parte_b: existingContrato.obrigacoes_parte_b || '',
        sla_kpi_resumo: existingContrato.sla_kpi_resumo || '',
        limite_responsabilidade: existingContrato.limite_responsabilidade || '',
        clausula_indemnizacao: existingContrato.clausula_indemnizacao || false,
        clausula_indemnizacao_resumo: existingContrato.clausula_indemnizacao_resumo || '',
        flag_confidencialidade: existingContrato.flag_confidencialidade || false,
        flag_nao_concorrencia: existingContrato.flag_nao_concorrencia || false,
        flag_exclusividade: existingContrato.flag_exclusividade || false,
        flag_direito_subcontratar: existingContrato.flag_direito_subcontratar || false,
        garantia_existente: existingContrato.garantia_existente || false,
        garantia_tipo: existingContrato.garantia_tipo || '',
        garantia_valor: existingContrato.garantia_valor,
        garantia_data_validade: existingContrato.garantia_data_validade
          ? new Date(existingContrato.garantia_data_validade)
          : null,
        tratamento_dados_pessoais: existingContrato.tratamento_dados_pessoais || false,
        papel_entidade: existingContrato.papel_entidade || '',
        categorias_dados_pessoais: existingContrato.categorias_dados_pessoais || '',
        categorias_titulares: existingContrato.categorias_titulares || '',
        transferencia_internacional: existingContrato.transferencia_internacional || false,
        paises_transferencia: existingContrato.paises_transferencia || '',
        base_legal_transferencia: existingContrato.base_legal_transferencia || '',
        existe_dpa_anexo_rgpd: existingContrato.existe_dpa_anexo_rgpd || false,
        referencia_dpa: existingContrato.referencia_dpa || '',
        dpia_realizada: existingContrato.dpia_realizada || false,
        referencia_dpia: existingContrato.referencia_dpia || '',
      });
      setClassifiedAreas(existingContrato?.areas_direito_aplicaveis || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingContrato, isEditing]);

  // Handle data extracted from AI

  const handleDataExtracted = (data: ExtractedContractData, file: File, extractedText: string) => {
    setUploadedFile(file);
    setExtractedContractText(extractedText);

    // Pre-fill the form with extracted data - Identificação
    if (data.titulo_contrato) form.setValue('titulo_contrato', data.titulo_contrato);
    if (data.tipo_contrato) form.setValue('tipo_contrato', data.tipo_contrato);
    // objeto_resumido: auto-fill from AI extraction
    form.setValue('objeto_resumido', data.objeto_resumido || 'N/A');

    // Parte A
    if (data.parte_a_nome_legal) form.setValue('parte_a_nome_legal', data.parte_a_nome_legal);
    if (data.parte_a_nif) form.setValue('parte_a_nif', data.parte_a_nif);
    if (data.parte_a_morada) form.setValue('parte_a_morada', data.parte_a_morada);

    // Parte B
    if (data.parte_b_nome_legal) form.setValue('parte_b_nome_legal', data.parte_b_nome_legal);
    if (data.parte_b_nif) form.setValue('parte_b_nif', data.parte_b_nif);
    if (data.parte_b_morada) form.setValue('parte_b_morada', data.parte_b_morada);

    // Datas
    if (data.data_assinatura) {
      const date = new Date(data.data_assinatura);
      form.setValue('data_assinatura_parte_a', date);
      form.setValue('data_assinatura_parte_b', date);
    }
    if (data.data_inicio_vigencia)
      form.setValue('data_inicio_vigencia', new Date(data.data_inicio_vigencia));
    if (data.data_termo) form.setValue('data_termo', new Date(data.data_termo));

    // Duração e Renovação
    if (data.tipo_duracao) form.setValue('tipo_duracao', data.tipo_duracao);
    if (data.tipo_renovacao) form.setValue('tipo_renovacao', data.tipo_renovacao);
    if (data.renovacao_periodo_meses)
      form.setValue('renovacao_periodo_meses', data.renovacao_periodo_meses);
    if (data.aviso_denuncia_dias)
      form.setValue('aviso_previo_nao_renovacao_dias', data.aviso_denuncia_dias);

    // Obrigações — auto-fill from AI, fallback to N/A
    form.setValue('obrigacoes_parte_a', data.obrigacoes_parte_a || 'N/A');
    form.setValue('obrigacoes_parte_b', data.obrigacoes_parte_b || 'N/A');
    form.setValue('sla_kpi_resumo', data.sla_indicadores || 'N/A');

    // Cláusulas especiais
    if (data.clausulas_especiais) {
      if (data.clausulas_especiais.confidencialidade) form.setValue('flag_confidencialidade', true);
      if (data.clausulas_especiais.nao_concorrencia) form.setValue('flag_nao_concorrencia', true);
      if (data.clausulas_especiais.exclusividade) form.setValue('flag_exclusividade', true);
      if (data.clausulas_especiais.subcontratacao) form.setValue('flag_direito_subcontratar', true);
      if (data.clausulas_especiais.protecao_dados) form.setValue('tratamento_dados_pessoais', true);
    }

    // Avança para o formulário após extracção
    setShowUploadStep(false);
  };

  const handleSkipUpload = () => {
    setShowUploadStep(false);
  };
  const onSubmit = async (data: ContratoFormValues) => {
    const contratoData: ContratoInsert = {
      id_interno: isEditing
        ? (existingContrato?.id_interno ?? generateInternalId())
        : generateInternalId(),
      titulo_contrato: data.titulo_contrato,
      tipo_contrato: data.tipo_contrato as TipoContrato,
      tipo_contrato_personalizado:
        data.tipo_contrato === 'outro' ? data.tipo_contrato_personalizado || null : null,
      estado_contrato: 'activo' as EstadoContrato,
      departamento_responsavel: data.departamento_responsavel as Departamento,
      objeto_resumido: data.objeto_resumido || null,
      parte_a_nome_legal: data.parte_a_nome_legal,
      parte_a_nif: data.parte_a_nif || null,
      parte_a_morada: data.parte_a_morada || null,
      parte_a_pais: data.parte_a_pais || null,
      parte_b_nome_legal: data.parte_b_nome_legal,
      parte_b_nif: data.parte_b_nif || null,
      parte_b_morada: data.parte_b_morada || null,
      parte_b_pais: data.parte_b_pais || null,
      parte_b_grupo_economico: data.parte_b_grupo_economico || null,
      data_assinatura_parte_a: data.data_assinatura_parte_a?.toISOString().split('T')[0] || null,
      data_assinatura_parte_b: data.data_assinatura_parte_b?.toISOString().split('T')[0] || null,
      data_inicio_vigencia: data.data_inicio_vigencia?.toISOString().split('T')[0] || null,
      data_termo: data.data_termo?.toISOString().split('T')[0] || null,
      tipo_duracao: data.tipo_duracao as TipoDuracao,
      tipo_renovacao: data.tipo_renovacao as TipoRenovacao,
      renovacao_periodo_meses: data.renovacao_periodo_meses || null,
      aviso_previo_nao_renovacao_dias: data.aviso_previo_nao_renovacao_dias,
      obrigacoes_parte_a: data.obrigacoes_parte_a || null,
      obrigacoes_parte_b: data.obrigacoes_parte_b || null,
      sla_kpi_resumo: data.sla_kpi_resumo || null,
      limite_responsabilidade: data.limite_responsabilidade || null,
      clausula_indemnizacao: data.clausula_indemnizacao,
      clausula_indemnizacao_resumo: data.clausula_indemnizacao_resumo || null,
      flag_confidencialidade: data.flag_confidencialidade,
      flag_nao_concorrencia: data.flag_nao_concorrencia,
      flag_exclusividade: data.flag_exclusividade,
      flag_direito_subcontratar: data.flag_direito_subcontratar,
      garantia_existente: data.garantia_existente,
      garantia_tipo: (data.garantia_tipo as TipoGarantia) || null,
      garantia_valor: data.garantia_valor || null,
      garantia_data_validade: data.garantia_data_validade?.toISOString().split('T')[0] || null,
      tratamento_dados_pessoais: data.tratamento_dados_pessoais,
      papel_entidade: (data.papel_entidade as PapelEntidade) || null,
      categorias_dados_pessoais: data.categorias_dados_pessoais || null,
      categorias_titulares: data.categorias_titulares || null,
      transferencia_internacional: data.transferencia_internacional,
      paises_transferencia: data.paises_transferencia || null,
      base_legal_transferencia: data.base_legal_transferencia || null,
      existe_dpa_anexo_rgpd: data.existe_dpa_anexo_rgpd,
      referencia_dpa: data.referencia_dpa || null,
      dpia_realizada: data.dpia_realizada,
      referencia_dpia: data.referencia_dpia || null,
    };

    if (isEditing && id) {
      await updateContrato.mutateAsync({ id, ...contratoData });

      // === PIPELINE IA: Gravar draft e enviar ao CCA (edição) ===
      const savedId = id;
      if (extractedContractText && savedId) {
        try {
          const draftPayload = {
            contrato_id: savedId,
            source: 'ai_extraction' as const,
            status: 'provisional' as const,
            extraction_data: {
              ...data,
              data_inicio_vigencia: data.data_inicio_vigencia?.toISOString().split('T')[0] || null,
              data_termo: data.data_termo?.toISOString().split('T')[0] || null,
            } as unknown as Record<string, unknown>,
            confidence: null,
            evidence: [] as unknown as Record<string, unknown>[],
            created_by_id: user?.id || null,
          };
          await supabase
            .from('contract_extractions')
            .upsert(draftPayload, { onConflict: 'contrato_id,source' });
          supabase.functions
            .invoke('validate-contract', {
              body: { contract_id: savedId, extraction_draft: draftPayload.extraction_data },
            })
            .catch((err) => console.warn('[CCA Pipeline] Non-blocking error:', err));
          await supabase
            .from('contratos')
            .update({ validation_status: 'draft_only' })
            .eq('id', savedId);
          try {
            const { callCCAAgent } = await import('@/lib/ccaAgent');
            callCCAAgent({
              contractId: savedId,
              documentPath: '',
              extractionDraft: draftPayload.extraction_data as Record<string, unknown>,
            });
          } catch {
            // Silencioso — não bloqueia o utilizador
          }
        } catch (err) {
          console.warn('[CCA Pipeline] Failed to save draft (non-blocking):', err);
        }
      }
      // Stay on page when editing - success toast is shown by the mutation
    } else {
      const result = await createContrato.mutateAsync(contratoData);
      const savedId = result?.id;

      // === PIPELINE IA: Gravar draft e enviar ao CCA (criação) ===
      if (extractedContractText && savedId) {
        try {
          const draftPayload = {
            contrato_id: savedId,
            source: 'ai_extraction' as const,
            status: 'provisional' as const,
            extraction_data: {
              ...data,
              data_inicio_vigencia: data.data_inicio_vigencia?.toISOString().split('T')[0] || null,
              data_termo: data.data_termo?.toISOString().split('T')[0] || null,
            } as unknown as Record<string, unknown>,
            confidence: null,
            evidence: [] as unknown as Record<string, unknown>[],
            created_by_id: user?.id || null,
          };
          await supabase
            .from('contract_extractions')
            .upsert(draftPayload, { onConflict: 'contrato_id,source' });
          supabase.functions
            .invoke('validate-contract', {
              body: { contract_id: savedId, extraction_draft: draftPayload.extraction_data },
            })
            .catch((err) => console.warn('[CCA Pipeline] Non-blocking error:', err));
          await supabase
            .from('contratos')
            .update({ validation_status: 'draft_only' })
            .eq('id', savedId);
          try {
            const { callCCAAgent } = await import('@/lib/ccaAgent');
            callCCAAgent({
              contractId: savedId,
              documentPath: '',
              extractionDraft: draftPayload.extraction_data as Record<string, unknown>,
            });
          } catch {
            // Silencioso — não bloqueia o utilizador
          }
        } catch (err) {
          console.warn('[CCA Pipeline] Failed to save draft (non-blocking):', err);
        }
      }

      // Navigate to edit page for new contract so user can continue working
      if (savedId) {
        navigate(`/contratos/${savedId}/editar`);
        return;
      }
      navigate('/contratos');
    }
  };

  const isSubmitting = createContrato.isPending || updateContrato.isPending;

  // Show loading state while fetching contract data
  if (isEditing && isLoadingContrato) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">A carregar contrato...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show upload step for new contracts
  if (showUploadStep && !isEditing) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/contratos">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-serif">Novo Contrato</h1>
              <p className="text-muted-foreground">
                Carregue o documento para preenchimento automático com IA
              </p>
            </div>
          </div>

          <ContractInitialUpload onDataExtracted={handleDataExtracted} onSkip={handleSkipUpload} />
        </div>
      </AppLayout>
    );
  }

  // Get risk badge color
  const _getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'crítico':
        return 'bg-red-600 text-white';
      case 'alto':
        return 'bg-orange-500 text-white';
      case 'médio':
        return 'bg-yellow-500 text-black';
      case 'baixo':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/contratos">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-serif">
                {isEditing ? 'Editar Contrato' : 'Novo Contrato'}
              </h1>
              <p className="text-muted-foreground">
                {isEditing
                  ? 'Actualize os dados do contrato'
                  : 'Reveja e complete os dados extraídos'}
              </p>
            </div>
          </div>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />A guardar...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar
              </>
            )}
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList
                className={`grid w-full ${isLocal ? 'grid-cols-3 lg:grid-cols-6' : 'grid-cols-3 lg:grid-cols-7'}`}
              >
                <TabsTrigger value="identificacao">Contrato</TabsTrigger>
                <TabsTrigger value="partes">Partes</TabsTrigger>
                <TabsTrigger value="datas">Prazos</TabsTrigger>
                {!isLocal && <TabsTrigger value="obrigacoes">Obrigações</TabsTrigger>}
                <TabsTrigger value="rgpd">RGPD</TabsTrigger>
                <TabsTrigger value="classificacao">Classificação</TabsTrigger>
                <TabsTrigger value="anexos">Documentos</TabsTrigger>
              </TabsList>

              {/* Tab 1: Contrato */}
              <TabsContent value="identificacao">
                <IdentificacaoTab form={form} isEditing={isEditing} contratoId={id} />
              </TabsContent>

              {/* Tab 2: Partes + Contactos */}
              <TabsContent value="partes">
                <PartesTab form={form} />
              </TabsContent>

              {/* Tab 3: Prazos */}
              <TabsContent value="datas">
                <DatasTab form={form} isLocal={isLocal} />
              </TabsContent>

              {/* Tab 4: Obrigações + Garantias */}
              <TabsContent value="obrigacoes">
                <ObrigacoesTab form={form} />
              </TabsContent>

              {/* Tab 6: RGPD */}
              <TabsContent value="rgpd">
                <RgpdTab form={form} isLocal={isLocal} />
              </TabsContent>
              <TabsContent value="classificacao" className="space-y-6 mt-6">
                {isEditing && id ? (
                  <ContractClassification
                    contratoId={id}
                    currentAreas={classifiedAreas}
                    tipoContrato={form.watch('tipo_contrato')}
                    onClassificationChange={setClassifiedAreas}
                  />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Tags className="h-5 w-5" />
                        Classificação Jurídica
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 space-y-4">
                        <Tags className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">
                            Guarde o contrato primeiro para poder classificar as áreas de direito
                            aplicáveis.
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            A classificação determina quais eventos legislativos serão usados na
                            análise de conformidade.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab 8: Documentos (Anexos + Análise de Conformidade) */}
              <TabsContent value="anexos" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Paperclip className="h-5 w-5" />
                      Anexos do Contrato
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing && id ? (
                      <ContractAttachments contratoId={id} canEdit={true} />
                    ) : (
                      <div className="text-center py-8 space-y-4">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">
                            Guarde o contrato primeiro para poder adicionar anexos.
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Após guardar, poderá fazer upload do PDF do contrato, adendas e outros
                            documentos.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Análise de Conformidade - apenas em edição */}
                {isEditing && id && (
                  <ContractComplianceAnalyzer
                    contratoId={id}
                    tipoContrato={form.watch('tipo_contrato')}
                    areasDireitoAplicaveis={classifiedAreas}
                    initialTextContent={extractedContractText}
                  />
                )}
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
