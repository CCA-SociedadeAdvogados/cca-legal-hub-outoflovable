import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, Save, Loader2, CalendarIcon, Upload, FileText, Sparkles, Paperclip, Tags } from 'lucide-react';
import { ContractAttachments } from '@/components/contracts/ContractAttachments';
import { ContractComplianceAnalyzer } from '@/components/contracts/ContractComplianceAnalyzer';
import { ContractClassification } from '@/components/contracts/ContractClassification';
import { ContractMainUpload } from '@/components/contracts/ContractMainUpload';
import { ContractInitialUpload } from '@/components/contracts/ContractInitialUpload';
// TriageAuditBadge removed — analysis done by external CCA agent
import { cn } from '@/lib/utils';
import { useContratos, useContrato, type ContratoInsert } from '@/hooks/useContratos';
import { 
  TIPO_CONTRATO_LABELS, 
  ESTADO_CONTRATO_LABELS, 
  DEPARTAMENTO_LABELS,
  TIPO_DURACAO_LABELS,
  TIPO_RENOVACAO_LABELS,
  ESTRUTURA_PRECOS_LABELS,
  PERIODICIDADE_FATURACAO_LABELS,
  PAPEL_ENTIDADE_LABELS,
  METODO_ASSINATURA_LABELS,
  TIPO_GARANTIA_LABELS,
} from '@/types/contracts';
import { canTransitionTo } from '@/lib/contractStateMachine';
import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';
import { CheckCircle2, XCircle, Globe } from 'lucide-react';

const formSchema = z.object({
  // Identificação
  id_interno: z.string().min(1, 'ID interno é obrigatório'),
  titulo_contrato: z.string().min(1, 'Título é obrigatório'),
  tipo_contrato: z.string().min(1, 'Tipo é obrigatório'),
  tipo_contrato_personalizado: z.string().optional(),
  estado_contrato: z.string().default('rascunho'),
  departamento_responsavel: z.string().min(1, 'Departamento é obrigatório'),
  objeto_resumido: z.string().optional(),
  
  // Partes
  parte_a_nome_legal: z.string().min(1, 'Nome legal da Parte A é obrigatório'),
  parte_a_nif: z.string().optional(),
  parte_a_morada: z.string().optional(),
  parte_a_pais: z.string().default('Portugal'),
  parte_b_nome_legal: z.string().min(1, 'Nome legal da Parte B é obrigatório'),
  parte_b_nif: z.string().optional(),
  parte_b_morada: z.string().optional(),
  parte_b_pais: z.string().default('Portugal'),
  parte_b_grupo_economico: z.string().optional(),
  
  // Contactos
  contacto_comercial_nome: z.string().optional(),
  contacto_comercial_email: z.string().email().optional().or(z.literal('')),
  contacto_comercial_telefone: z.string().optional(),
  contacto_operacional_nome: z.string().optional(),
  contacto_operacional_email: z.string().email().optional().or(z.literal('')),
  contacto_faturacao_nome: z.string().optional(),
  contacto_faturacao_email: z.string().email().optional().or(z.literal('')),
  contacto_legal_nome: z.string().optional(),
  contacto_legal_email: z.string().email().optional().or(z.literal('')),
  
  // Datas
  data_assinatura_parte_a: z.date().optional().nullable(),
  data_assinatura_parte_b: z.date().optional().nullable(),
  data_inicio_vigencia: z.date().optional().nullable(),
  data_termo: z.date().optional().nullable(),
  tipo_duracao: z.string().default('prazo_determinado'),
  tipo_renovacao: z.string().default('sem_renovacao_automatica'),
  renovacao_periodo_meses: z.number().optional().nullable(),
  aviso_previo_nao_renovacao_dias: z.number().default(30),
  
  // Financeiro
  valor_total_estimado: z.number().optional().nullable(),
  valor_anual_recorrente: z.number().optional().nullable(),
  moeda: z.string().default('EUR'),
  estrutura_precos: z.string().optional(),
  periodicidade_faturacao: z.string().optional(),
  prazo_pagamento_dias: z.number().default(30),
  centro_custo: z.string().optional(),
  numero_encomenda_po: z.string().optional(),
  
  // Obrigações e Riscos
  obrigacoes_parte_a: z.string().optional(),
  obrigacoes_parte_b: z.string().optional(),
  sla_kpi_resumo: z.string().optional(),
  limite_responsabilidade: z.string().optional(),
  clausula_indemnizacao: z.boolean().default(false),
  clausula_indemnizacao_resumo: z.string().optional(),
  flag_confidencialidade: z.boolean().default(false),
  flag_nao_concorrencia: z.boolean().default(false),
  flag_exclusividade: z.boolean().default(false),
  flag_direito_subcontratar: z.boolean().default(false),
  
  // Garantias
  garantia_existente: z.boolean().default(false),
  garantia_tipo: z.string().optional(),
  garantia_valor: z.number().optional().nullable(),
  garantia_data_validade: z.date().optional().nullable(),
  
  // RGPD
  tratamento_dados_pessoais: z.boolean().default(false),
  papel_entidade: z.string().optional(),
  categorias_dados_pessoais: z.string().optional(),
  categorias_titulares: z.string().optional(),
  transferencia_internacional: z.boolean().default(false),
  paises_transferencia: z.string().optional(),
  base_legal_transferencia: z.string().optional(),
  existe_dpa_anexo_rgpd: z.boolean().default(false),
  referencia_dpa: z.string().optional(),
  dpia_realizada: z.boolean().default(false),
  referencia_dpia: z.string().optional(),
  
  // Aprovação
  metodo_assinatura: z.string().optional(),
  ferramenta_assinatura: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function DatePickerField({ 
  value, 
  onChange, 
  placeholder = "Selecione uma data" 
}: { 
  value?: Date | null; 
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "d 'de' MMMM 'de' yyyy", { locale: pt }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value || undefined}
          onSelect={onChange}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

export default function ContratoForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'novo';
  const { createContrato, updateContrato } = useContratos();
  const { isLocal } = useLegalHubProfile(); // true for org_user / org_manager (client users)
  const { user } = useAuth();
  
  // Use dedicated hook for fetching individual contract with fresh data
  const { data: existingContrato, isLoading: isLoadingContrato } = useContrato(isEditing ? id : undefined);
  
  const [activeTab, setActiveTab] = useState('identificacao');
  const [showUploadStep, setShowUploadStep] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedContractText, setExtractedContractText] = useState<string>('');
  // triageResult removed — analysis done by external CCA agent

  const [classifiedAreas, setClassifiedAreas] = useState<string[]>(
    existingContrato?.areas_direito_aplicaveis || []
  );

  // Function to generate internal ID
  const generateInternalId = () => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CTR-${year}-${random}`;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingContrato ? {
      id_interno: existingContrato.id_interno,
      titulo_contrato: existingContrato.titulo_contrato,
      tipo_contrato: existingContrato.tipo_contrato,
      tipo_contrato_personalizado: existingContrato.tipo_contrato_personalizado || '',
      estado_contrato: existingContrato.estado_contrato,
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
      contacto_comercial_nome: existingContrato.contacto_comercial_nome || '',
      contacto_comercial_email: existingContrato.contacto_comercial_email || '',
      contacto_comercial_telefone: existingContrato.contacto_comercial_telefone || '',
      contacto_operacional_nome: existingContrato.contacto_operacional_nome || '',
      contacto_operacional_email: existingContrato.contacto_operacional_email || '',
      contacto_faturacao_nome: existingContrato.contacto_faturacao_nome || '',
      contacto_faturacao_email: existingContrato.contacto_faturacao_email || '',
      contacto_legal_nome: existingContrato.contacto_legal_nome || '',
      contacto_legal_email: existingContrato.contacto_legal_email || '',
      data_assinatura_parte_a: existingContrato.data_assinatura_parte_a ? new Date(existingContrato.data_assinatura_parte_a) : null,
      data_assinatura_parte_b: existingContrato.data_assinatura_parte_b ? new Date(existingContrato.data_assinatura_parte_b) : null,
      data_inicio_vigencia: existingContrato.data_inicio_vigencia ? new Date(existingContrato.data_inicio_vigencia) : null,
      data_termo: existingContrato.data_termo ? new Date(existingContrato.data_termo) : null,
      tipo_duracao: existingContrato.tipo_duracao,
      tipo_renovacao: existingContrato.tipo_renovacao,
      renovacao_periodo_meses: existingContrato.renovacao_periodo_meses,
      aviso_previo_nao_renovacao_dias: existingContrato.aviso_previo_nao_renovacao_dias || 30,
      valor_total_estimado: existingContrato.valor_total_estimado,
      valor_anual_recorrente: existingContrato.valor_anual_recorrente,
      moeda: existingContrato.moeda || 'EUR',
      estrutura_precos: existingContrato.estrutura_precos || '',
      periodicidade_faturacao: existingContrato.periodicidade_faturacao || '',
      prazo_pagamento_dias: existingContrato.prazo_pagamento_dias || 30,
      centro_custo: existingContrato.centro_custo || '',
      numero_encomenda_po: existingContrato.numero_encomenda_po || '',
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
      garantia_data_validade: existingContrato.garantia_data_validade ? new Date(existingContrato.garantia_data_validade) : null,
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
      metodo_assinatura: existingContrato.metodo_assinatura || '',
      ferramenta_assinatura: existingContrato.ferramenta_assinatura || '',
    } : {
      id_interno: '',
      titulo_contrato: '',
      tipo_contrato: 'prestacao_servicos',
      estado_contrato: 'rascunho',
      departamento_responsavel: 'outro',
      parte_a_nome_legal: 'Radar Conformidade, Lda.',
      parte_a_pais: 'Portugal',
      parte_b_nome_legal: '',
      parte_b_pais: 'Portugal',
      tipo_duracao: 'prazo_determinado',
      tipo_renovacao: 'sem_renovacao_automatica',
      aviso_previo_nao_renovacao_dias: 30,
      moeda: 'EUR',
      prazo_pagamento_dias: 30,
    },
  });

  // Sync form when server data changes (for real-time updates between users)
  useEffect(() => {
    if (existingContrato && isEditing) {
      form.reset({
        id_interno: existingContrato.id_interno,
        titulo_contrato: existingContrato.titulo_contrato,
        tipo_contrato: existingContrato.tipo_contrato,
        tipo_contrato_personalizado: existingContrato.tipo_contrato_personalizado || '',
        estado_contrato: existingContrato.estado_contrato,
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
        contacto_comercial_nome: existingContrato.contacto_comercial_nome || '',
        contacto_comercial_email: existingContrato.contacto_comercial_email || '',
        contacto_comercial_telefone: existingContrato.contacto_comercial_telefone || '',
        contacto_operacional_nome: existingContrato.contacto_operacional_nome || '',
        contacto_operacional_email: existingContrato.contacto_operacional_email || '',
        contacto_faturacao_nome: existingContrato.contacto_faturacao_nome || '',
        contacto_faturacao_email: existingContrato.contacto_faturacao_email || '',
        contacto_legal_nome: existingContrato.contacto_legal_nome || '',
        contacto_legal_email: existingContrato.contacto_legal_email || '',
        data_assinatura_parte_a: existingContrato.data_assinatura_parte_a ? new Date(existingContrato.data_assinatura_parte_a) : null,
        data_assinatura_parte_b: existingContrato.data_assinatura_parte_b ? new Date(existingContrato.data_assinatura_parte_b) : null,
        data_inicio_vigencia: existingContrato.data_inicio_vigencia ? new Date(existingContrato.data_inicio_vigencia) : null,
        data_termo: existingContrato.data_termo ? new Date(existingContrato.data_termo) : null,
        tipo_duracao: existingContrato.tipo_duracao,
        tipo_renovacao: existingContrato.tipo_renovacao,
        renovacao_periodo_meses: existingContrato.renovacao_periodo_meses,
        aviso_previo_nao_renovacao_dias: existingContrato.aviso_previo_nao_renovacao_dias || 30,
        valor_total_estimado: existingContrato.valor_total_estimado,
        valor_anual_recorrente: existingContrato.valor_anual_recorrente,
        moeda: existingContrato.moeda || 'EUR',
        estrutura_precos: existingContrato.estrutura_precos || '',
        periodicidade_faturacao: existingContrato.periodicidade_faturacao || '',
        prazo_pagamento_dias: existingContrato.prazo_pagamento_dias || 30,
        centro_custo: existingContrato.centro_custo || '',
        numero_encomenda_po: existingContrato.numero_encomenda_po || '',
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
        garantia_data_validade: existingContrato.garantia_data_validade ? new Date(existingContrato.garantia_data_validade) : null,
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
        metodo_assinatura: existingContrato.metodo_assinatura || '',
        ferramenta_assinatura: existingContrato.ferramenta_assinatura || '',
      });
      setClassifiedAreas(existingContrato?.areas_direito_aplicaveis || []);
    }
  }, [existingContrato, isEditing]);

  // Handle data extracted from AI
  const handleDataExtracted = (data: any, file: File, extractedText: string) => {
    setUploadedFile(file);
    setExtractedContractText(extractedText);
    
    // Pre-fill the form with extracted data - Identificação
    if (data.titulo_contrato) form.setValue('titulo_contrato', data.titulo_contrato);
    if (data.tipo_contrato) form.setValue('tipo_contrato', data.tipo_contrato);
    if (data.objeto_resumido) form.setValue('objeto_resumido', data.objeto_resumido);
    
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
    if (data.data_inicio_vigencia) form.setValue('data_inicio_vigencia', new Date(data.data_inicio_vigencia));
    if (data.data_termo) form.setValue('data_termo', new Date(data.data_termo));
    
    // Duração e Renovação
    if (data.tipo_duracao) form.setValue('tipo_duracao', data.tipo_duracao);
    if (data.tipo_renovacao) form.setValue('tipo_renovacao', data.tipo_renovacao);
    if (data.renovacao_periodo_meses) form.setValue('renovacao_periodo_meses', data.renovacao_periodo_meses);
    if (data.aviso_denuncia_dias) form.setValue('aviso_previo_nao_renovacao_dias', data.aviso_denuncia_dias);
    
    // Financeiro
    if (data.valor_total_estimado) form.setValue('valor_total_estimado', data.valor_total_estimado);
    if (data.valor_mensal) form.setValue('valor_anual_recorrente', data.valor_mensal * 12);
    if (data.moeda) form.setValue('moeda', data.moeda);
    if (data.prazo_pagamento_dias) form.setValue('prazo_pagamento_dias', data.prazo_pagamento_dias);
    if (data.periodicidade_faturacao) form.setValue('periodicidade_faturacao', data.periodicidade_faturacao);
    
    // Obrigações
    if (data.obrigacoes_parte_a) form.setValue('obrigacoes_parte_a', data.obrigacoes_parte_a);
    if (data.obrigacoes_parte_b) form.setValue('obrigacoes_parte_b', data.obrigacoes_parte_b);
    if (data.sla_indicadores) form.setValue('sla_kpi_resumo', data.sla_indicadores);
    
    // Cláusulas especiais
    if (data.clausulas_especiais) {
      if (data.clausulas_especiais.confidencialidade) form.setValue('flag_confidencialidade', true);
      if (data.clausulas_especiais.nao_concorrencia) form.setValue('flag_nao_concorrencia', true);
      if (data.clausulas_especiais.exclusividade) form.setValue('flag_exclusividade', true);
      if (data.clausulas_especiais.subcontratacao) form.setValue('flag_direito_subcontratar', true);
      if (data.clausulas_especiais.protecao_dados) form.setValue('tratamento_dados_pessoais', true);
    }
    
    // Generate internal ID if not set
    if (!form.getValues('id_interno')) {
      form.setValue('id_interno', generateInternalId());
    }

    // Avança para o formulário após extracção
    setShowUploadStep(false);
  };

  const handleSkipUpload = () => {
    setShowUploadStep(false);
    // Generate internal ID
    form.setValue('id_interno', generateInternalId());
  };
  const onSubmit = async (data: FormValues) => {
    const contratoData: ContratoInsert = {
      id_interno: data.id_interno,
      titulo_contrato: data.titulo_contrato,
      tipo_contrato: data.tipo_contrato as any,
      tipo_contrato_personalizado: data.tipo_contrato === 'outro' ? data.tipo_contrato_personalizado || null : null,
      estado_contrato: data.estado_contrato as any,
      departamento_responsavel: data.departamento_responsavel as any,
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
      contacto_comercial_nome: data.contacto_comercial_nome || null,
      contacto_comercial_email: data.contacto_comercial_email || null,
      contacto_comercial_telefone: data.contacto_comercial_telefone || null,
      contacto_operacional_nome: data.contacto_operacional_nome || null,
      contacto_operacional_email: data.contacto_operacional_email || null,
      contacto_faturacao_nome: data.contacto_faturacao_nome || null,
      contacto_faturacao_email: data.contacto_faturacao_email || null,
      contacto_legal_nome: data.contacto_legal_nome || null,
      contacto_legal_email: data.contacto_legal_email || null,
      data_assinatura_parte_a: data.data_assinatura_parte_a?.toISOString().split('T')[0] || null,
      data_assinatura_parte_b: data.data_assinatura_parte_b?.toISOString().split('T')[0] || null,
      data_inicio_vigencia: data.data_inicio_vigencia?.toISOString().split('T')[0] || null,
      data_termo: data.data_termo?.toISOString().split('T')[0] || null,
      tipo_duracao: data.tipo_duracao as any,
      tipo_renovacao: data.tipo_renovacao as any,
      renovacao_periodo_meses: data.renovacao_periodo_meses || null,
      aviso_previo_nao_renovacao_dias: data.aviso_previo_nao_renovacao_dias,
      valor_total_estimado: data.valor_total_estimado || null,
      valor_anual_recorrente: data.valor_anual_recorrente || null,
      moeda: data.moeda || null,
      estrutura_precos: (data.estrutura_precos as any) || null,
      // Filter invalid periodicidade_faturacao values - only allow valid enum values
      periodicidade_faturacao: ['mensal', 'trimestral', 'semestral', 'anual', 'por_marco', 'a_cabeca'].includes(data.periodicidade_faturacao || '') 
        ? (data.periodicidade_faturacao as any) 
        : null,
      prazo_pagamento_dias: data.prazo_pagamento_dias,
      centro_custo: data.centro_custo || null,
      numero_encomenda_po: data.numero_encomenda_po || null,
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
      garantia_tipo: (data.garantia_tipo as any) || null,
      garantia_valor: data.garantia_valor || null,
      garantia_data_validade: data.garantia_data_validade?.toISOString().split('T')[0] || null,
      tratamento_dados_pessoais: data.tratamento_dados_pessoais,
      papel_entidade: (data.papel_entidade as any) || null,
      categorias_dados_pessoais: data.categorias_dados_pessoais || null,
      categorias_titulares: data.categorias_titulares || null,
      transferencia_internacional: data.transferencia_internacional,
      paises_transferencia: data.paises_transferencia || null,
      base_legal_transferencia: data.base_legal_transferencia || null,
      existe_dpa_anexo_rgpd: data.existe_dpa_anexo_rgpd,
      referencia_dpa: data.referencia_dpa || null,
      dpia_realizada: data.dpia_realizada,
      referencia_dpia: data.referencia_dpia || null,
      metodo_assinatura: (data.metodo_assinatura as any) || null,
      ferramenta_assinatura: data.ferramenta_assinatura || null,
    };

    if (isEditing && id) {
      await updateContrato.mutateAsync({ id, ...contratoData });

      // === PIPELINE IA: Gravar draft e enviar ao CCA (edição) ===
      const savedId = id;
      if (extractedContractText && savedId) {
        try {
          const draftPayload: any = {
            contrato_id: savedId,
            source: 'ai_extraction',
            status: 'provisional',
            extraction_data: {
              ...data,
              data_inicio_vigencia: data.data_inicio_vigencia?.toISOString().split('T')[0] || null,
              data_termo: data.data_termo?.toISOString().split('T')[0] || null,
            },
            confidence: null,
            evidence: [],
            created_by_id: user?.id || null,
          };
          await supabase.from('contract_extractions').upsert(draftPayload, { onConflict: 'contrato_id,source' });
          supabase.functions.invoke('validate-contract', {
            body: { contract_id: savedId, extraction_draft: draftPayload.extraction_data },
          }).catch(err => console.warn('[CCA Pipeline] Non-blocking error:', err));
          await supabase.from('contratos').update({ validation_status: 'draft_only' } as any).eq('id', savedId);
          try {
            const { callCCAAgent } = await import('@/lib/ccaAgent');
            callCCAAgent({
              contractId: savedId,
              documentPath: '',
              extractionDraft: draftPayload.extraction_data as Record<string, unknown>,
            });
          } catch (_e) {
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
          const draftPayload: any = {
            contrato_id: savedId,
            source: 'ai_extraction',
            status: 'provisional',
            extraction_data: {
              ...data,
              data_inicio_vigencia: data.data_inicio_vigencia?.toISOString().split('T')[0] || null,
              data_termo: data.data_termo?.toISOString().split('T')[0] || null,
            },
            confidence: null,
            evidence: [],
            created_by_id: user?.id || null,
          };
          await supabase.from('contract_extractions').upsert(draftPayload, { onConflict: 'contrato_id,source' });
          supabase.functions.invoke('validate-contract', {
            body: { contract_id: savedId, extraction_draft: draftPayload.extraction_data },
          }).catch(err => console.warn('[CCA Pipeline] Non-blocking error:', err));
          await supabase.from('contratos').update({ validation_status: 'draft_only' } as any).eq('id', savedId);
          try {
            const { callCCAAgent } = await import('@/lib/ccaAgent');
            callCCAAgent({
              contractId: savedId,
              documentPath: '',
              extractionDraft: draftPayload.extraction_data as Record<string, unknown>,
            });
          } catch (_e) {
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
              <Link to="/contratos"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-serif">Novo Contrato</h1>
              <p className="text-muted-foreground">
                Carregue o documento para preenchimento automático com IA
              </p>
            </div>
          </div>

          <ContractInitialUpload 
            onDataExtracted={handleDataExtracted}
            onSkip={handleSkipUpload}
          />
        </div>
      </AppLayout>
    );
  }

  // Get risk badge color
  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'crítico': return 'bg-red-600 text-white';
      case 'alto': return 'bg-orange-500 text-white';
      case 'médio': return 'bg-yellow-500 text-black';
      case 'baixo': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/contratos"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-serif">
                {isEditing ? 'Editar Contrato' : 'Novo Contrato'}
              </h1>
              <p className="text-muted-foreground">
                {isEditing ? 'Actualize os dados do contrato' : 'Reveja e complete os dados extraídos'}
              </p>
            </div>
          </div>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A guardar...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Guardar</>
            )}
          </Button>
        </div>






        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid w-full ${isLocal ? 'grid-cols-3 lg:grid-cols-6' : 'grid-cols-4 lg:grid-cols-8'}`}>
                <TabsTrigger value="identificacao">Contrato</TabsTrigger>
                <TabsTrigger value="partes">Partes</TabsTrigger>
                <TabsTrigger value="datas">Prazos</TabsTrigger>
                {!isLocal && <TabsTrigger value="financeiro">Financeiro</TabsTrigger>}
                {!isLocal && <TabsTrigger value="obrigacoes">Obrigações</TabsTrigger>}
                <TabsTrigger value="rgpd">RGPD</TabsTrigger>
                <TabsTrigger value="classificacao">Classificação</TabsTrigger>
                <TabsTrigger value="anexos">Documentos</TabsTrigger>
              </TabsList>

              {/* Tab 1: Contrato */}
              <TabsContent value="identificacao" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Identificação do Contrato</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2">
                    {!isLocal && (
                      <FormField
                        control={form.control}
                        name="id_interno"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ID Interno *</FormLabel>
                            <FormControl>
                              <Input placeholder="CTR-2024-XXX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="tipo_contrato"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Contrato *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(TIPO_CONTRATO_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {form.watch('tipo_contrato') === 'outro' && (
                      <FormField
                        control={form.control}
                        name="tipo_contrato_personalizado"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo Personalizado</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Shareholder Agreement, Joint Venture..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="titulo_contrato"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Título do Contrato *</FormLabel>
                          <FormControl>
                            <Input placeholder="Título descritivo do contrato" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {!isLocal && (
                      <FormField
                        control={form.control}
                        name="estado_contrato"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(ESTADO_CONTRATO_LABELS)
                                  .filter(([value]) => {
                                    const currentState = existingContrato?.estado_contrato || 'rascunho';
                                    return value === currentState || canTransitionTo(currentState as any, value as any);
                                  })
                                  .map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="departamento_responsavel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departamento Responsável *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(DEPARTAMENTO_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="objeto_resumido"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Objecto (Resumo)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descrição resumida do objecto do contrato" 
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Upload do Contrato - só disponível após guardar */}
                {isEditing && id && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Upload do Contrato
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ContractMainUpload contratoId={id} />
                    </CardContent>
                  </Card>
                )}

                {!isEditing && (
                  <Card className="border-dashed border-muted-foreground/50">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <Upload className="h-8 w-8 mx-auto mb-3 opacity-50" />
                      <p>Guarde o contrato primeiro para poder fazer upload do ficheiro.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab 2: Partes + Contactos */}
              <TabsContent value="partes" className="space-y-6 mt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Parte A (A sua Organização)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="parte_a_nome_legal" render={({ field }) => (
                        <FormItem><FormLabel>Nome Legal *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="parte_a_nif" render={({ field }) => (
                        <FormItem><FormLabel>NIF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="parte_a_morada" render={({ field }) => (
                        <FormItem><FormLabel>Morada</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="parte_a_pais" render={({ field }) => (
                        <FormItem><FormLabel>País</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Parte B (Contraparte)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="parte_b_nome_legal" render={({ field }) => (
                        <FormItem><FormLabel>Nome Legal *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="parte_b_nif" render={({ field }) => (
                        <FormItem><FormLabel>NIF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="parte_b_grupo_economico" render={({ field }) => (
                        <FormItem><FormLabel>Grupo Económico</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="parte_b_morada" render={({ field }) => (
                        <FormItem><FormLabel>Morada</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="parte_b_pais" render={({ field }) => (
                        <FormItem><FormLabel>País</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </CardContent>
                  </Card>
                </div>

                {/* Contactos */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle>Contacto Comercial</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="contacto_comercial_nome" render={({ field }) => (
                        <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="contacto_comercial_email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="contacto_comercial_telefone" render={({ field }) => (
                        <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Contacto Operacional</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="contacto_operacional_nome" render={({ field }) => (
                        <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="contacto_operacional_email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                      )} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Contacto Facturação</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="contacto_faturacao_nome" render={({ field }) => (
                        <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="contacto_faturacao_email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                      )} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Contacto Legal</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="contacto_legal_nome" render={({ field }) => (
                        <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="contacto_legal_email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                      )} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab 3: Prazos */}
              <TabsContent value="datas" className="space-y-6 mt-6">
                <Card>
                  <CardHeader><CardTitle>Datas e Duração</CardTitle></CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2">
                    {!isLocal && (
                      <FormField control={form.control} name="data_assinatura_parte_a" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Assinatura Parte A</FormLabel>
                          <DatePickerField value={field.value} onChange={field.onChange} />
                        </FormItem>
                      )} />
                    )}
                    {!isLocal && (
                      <FormField control={form.control} name="data_assinatura_parte_b" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Assinatura Parte B</FormLabel>
                          <DatePickerField value={field.value} onChange={field.onChange} />
                        </FormItem>
                      )} />
                    )}
                    <FormField control={form.control} name="data_inicio_vigencia" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início de Vigência</FormLabel>
                        <DatePickerField value={field.value} onChange={field.onChange} />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="data_termo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Termo</FormLabel>
                        <DatePickerField value={field.value} onChange={field.onChange} />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="tipo_duracao" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Duração</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.entries(TIPO_DURACAO_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="tipo_renovacao" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Renovação</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.entries(TIPO_RENOVACAO_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="renovacao_periodo_meses" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Período de Renovação (meses)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} value={field.value ?? ''} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="aviso_previo_nao_renovacao_dias" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aviso Prévio (dias)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                {/* Assinatura — visível apenas para utilizadores internos */}
                {!isLocal && (
                  <Card>
                    <CardHeader><CardTitle>Assinatura</CardTitle></CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                      <FormField control={form.control} name="metodo_assinatura" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Método de Assinatura</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {Object.entries(METODO_ASSINATURA_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="ferramenta_assinatura" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ferramenta de Assinatura</FormLabel>
                          <FormControl><Input {...field} placeholder="Ex: DocuSign, Adobe Sign" /></FormControl>
                        </FormItem>
                      )} />
                    </CardContent>
                  </Card>
                )}

                {/* Alertas */}
                <Card>
                  <CardHeader><CardTitle>Configuração de Alertas</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Os alertas são configurados automaticamente com base nas datas definidas. 
                      Receberá notificações 90, 60 e 30 dias antes da expiração do contrato.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 4: Financeiro */}
              <TabsContent value="financeiro" className="space-y-6 mt-6">
                <Card>
                  <CardHeader><CardTitle>Condições Financeiras</CardTitle></CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2">
                    <FormField control={form.control} name="valor_total_estimado" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Total Estimado</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} value={field.value ?? ''} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="valor_anual_recorrente" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Anual Recorrente</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} value={field.value ?? ''} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="moeda" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moeda</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="estrutura_precos" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estrutura de Preços</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.entries(ESTRUTURA_PRECOS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="periodicidade_faturacao" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Periodicidade Facturação</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.entries(PERIODICIDADE_FATURACAO_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="prazo_pagamento_dias" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo Pagamento (dias)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="centro_custo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Centro de Custo</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="numero_encomenda_po" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº Encomenda / PO</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 5: Obrigações + Garantias */}
              <TabsContent value="obrigacoes" className="space-y-6 mt-6">
                <Card>
                  <CardHeader><CardTitle>Obrigações e Cláusulas</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField control={form.control} name="obrigacoes_parte_a" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Obrigações Parte A</FormLabel>
                          <FormControl><Textarea rows={4} {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="obrigacoes_parte_b" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Obrigações Parte B</FormLabel>
                          <FormControl><Textarea rows={4} {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="sla_kpi_resumo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>SLA/KPI (Resumo)</FormLabel>
                        <FormControl><Textarea rows={2} {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="limite_responsabilidade" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limite de Responsabilidade</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField control={form.control} name="flag_confidencialidade" render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <FormLabel>Cláusula de Confidencialidade</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="flag_nao_concorrencia" render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <FormLabel>Não Concorrência</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="flag_exclusividade" render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <FormLabel>Exclusividade</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="flag_direito_subcontratar" render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <FormLabel>Direito a Subcontratar</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="clausula_indemnizacao" render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <FormLabel>Cláusula de Indemnização</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    {form.watch('clausula_indemnizacao') && (
                      <FormField control={form.control} name="clausula_indemnizacao_resumo" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resumo Cláusula Indemnização</FormLabel>
                          <FormControl><Textarea rows={2} {...field} /></FormControl>
                        </FormItem>
                      )} />
                    )}
                  </CardContent>
                </Card>

                {/* Garantias */}
                <Card>
                  <CardHeader><CardTitle>Garantias</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <FormField control={form.control} name="garantia_existente" render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <FormLabel>Existe Garantia</FormLabel>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    {form.watch('garantia_existente') && (
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField control={form.control} name="garantia_tipo" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Garantia</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {Object.entries(TIPO_GARANTIA_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="garantia_valor" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor da Garantia</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} value={field.value ?? ''} />
                            </FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="garantia_data_validade" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data Validade Garantia</FormLabel>
                            <DatePickerField value={field.value} onChange={field.onChange} />
                          </FormItem>
                        )} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 6: RGPD */}
              <TabsContent value="rgpd" className="space-y-6 mt-6">
                <Card>
                  <CardHeader><CardTitle>RGPD e Protecção de Dados</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    {isLocal ? (
                      /* Utilizadores cliente: apenas 3 indicadores de leitura preenchidos pelo Agente CCA */
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Indicadores detectados automaticamente pelo Agente CCA após análise do documento.
                        </p>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="flex items-center gap-3 rounded-lg border p-4">
                            {form.watch('tratamento_dados_pessoais')
                              ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                              : <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                            }
                            <div>
                              <p className="font-medium text-sm">Dados pessoais detectados</p>
                              <p className="text-xs text-muted-foreground">{form.watch('tratamento_dados_pessoais') ? 'Sim' : 'Não'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 rounded-lg border p-4">
                            {form.watch('existe_dpa_anexo_rgpd')
                              ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                              : <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                            }
                            <div>
                              <p className="font-medium text-sm">DPA detectado</p>
                              <p className="text-xs text-muted-foreground">{form.watch('existe_dpa_anexo_rgpd') ? 'Sim' : 'Não'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 rounded-lg border p-4">
                            {form.watch('transferencia_internacional')
                              ? <Globe className="h-5 w-5 text-amber-500 shrink-0" />
                              : <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                            }
                            <div>
                              <p className="font-medium text-sm">Transferência internacional detectada</p>
                              <p className="text-xs text-muted-foreground">{form.watch('transferencia_internacional') ? 'Sim' : 'Não'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Utilizadores internos: formulário completo */
                      <>
                        <FormField control={form.control} name="tratamento_dados_pessoais" render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <FormLabel>Envolve Tratamento de Dados Pessoais</FormLabel>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} />
                        {form.watch('tratamento_dados_pessoais') && (
                          <>
                            <div className="grid gap-6 md:grid-cols-2">
                              <FormField control={form.control} name="papel_entidade" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Papel da Entidade</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {Object.entries(PAPEL_ENTIDADE_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="categorias_dados_pessoais" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Categorias de Dados</FormLabel>
                                  <FormControl><Input {...field} placeholder="Ex: Nome, email, morada" /></FormControl>
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="categorias_titulares" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Categorias de Titulares</FormLabel>
                                  <FormControl><Input {...field} placeholder="Ex: Clientes, colaboradores" /></FormControl>
                                </FormItem>
                              )} />
                            </div>
                            <FormField control={form.control} name="transferencia_internacional" render={({ field }) => (
                              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                <FormLabel>Transferência Internacional</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              </FormItem>
                            )} />
                            {form.watch('transferencia_internacional') && (
                              <div className="grid gap-6 md:grid-cols-2">
                                <FormField control={form.control} name="paises_transferencia" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Países de Transferência</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                  </FormItem>
                                )} />
                                <FormField control={form.control} name="base_legal_transferencia" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Base Legal</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                  </FormItem>
                                )} />
                              </div>
                            )}
                            <div className="grid gap-4 md:grid-cols-2">
                              <FormField control={form.control} name="existe_dpa_anexo_rgpd" render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                  <FormLabel>Existe DPA/Anexo RGPD</FormLabel>
                                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="dpia_realizada" render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                  <FormLabel>DPIA Realizada</FormLabel>
                                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                              )} />
                            </div>
                            {form.watch('existe_dpa_anexo_rgpd') && (
                              <FormField control={form.control} name="referencia_dpa" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Referência DPA</FormLabel>
                                  <FormControl><Input {...field} /></FormControl>
                                </FormItem>
                              )} />
                            )}
                            {form.watch('dpia_realizada') && (
                              <FormField control={form.control} name="referencia_dpia" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Referência DPIA</FormLabel>
                                  <FormControl><Input {...field} /></FormControl>
                                </FormItem>
                              )} />
                            )}
                          </>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
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
                            Guarde o contrato primeiro para poder classificar as áreas de direito aplicáveis.
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            A classificação determina quais eventos legislativos serão usados na análise de conformidade.
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
                            Após guardar, poderá fazer upload do PDF do contrato, adendas e outros documentos.
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
