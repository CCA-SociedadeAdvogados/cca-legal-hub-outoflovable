-- Drop and recreate contratos_safe view with platform_admin check on all sensitive fields
DROP VIEW IF EXISTS public.contratos_safe;

CREATE VIEW public.contratos_safe
WITH (security_invoker = on) AS
SELECT 
  -- Campos públicos (sempre visíveis)
  c.id,
  c.id_interno,
  c.titulo_contrato,
  c.objeto_resumido,
  c.tipo_contrato,
  c.tipo_contrato_personalizado,
  c.estado_contrato,
  c.estado_aprovacao,
  c.departamento_responsavel,
  c.responsavel_interno_id,
  c.responsavel_revisao_renovacao_id,
  c.data_assinatura_parte_a,
  c.data_assinatura_parte_b,
  c.data_inicio_vigencia,
  c.data_termo,
  c.tipo_duracao,
  c.tipo_renovacao,
  c.renovacao_periodo_meses,
  c.aviso_previo_nao_renovacao_dias,
  c.data_limite_decisao_renovacao,
  c.alerta_renovacao_90_dias,
  c.alerta_renovacao_60_dias,
  c.alerta_renovacao_30_dias,
  c.resultado_ultima_revisao,
  c.numero_adendas,
  c.versao_actual,
  c.arquivado,
  c.created_at,
  c.updated_at,
  c.created_by_id,
  c.updated_by_id,
  c.organization_id,
  c.iniciado_por_id,
  c.data_conclusao_assinatura,
  c.metodo_assinatura,
  c.parte_a_nome_legal,
  c.parte_a_pais,
  c.parte_b_nome_legal,
  c.parte_b_grupo_economico,
  c.parte_b_pais,
  c.flag_confidencialidade,
  c.flag_nao_concorrencia,
  c.flag_exclusividade,
  c.flag_direito_subcontratar,
  c.tratamento_dados_pessoais,
  c.papel_entidade,
  c.transferencia_internacional,
  c.existe_dpa_anexo_rgpd,
  c.dpia_realizada,
  c.areas_direito_aplicaveis,

  -- Campos sensíveis (redactados para viewers, visíveis para platform_admin ou editor+)
  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.parte_a_nif
    ELSE NULL
  END AS parte_a_nif,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.parte_a_morada
    ELSE NULL
  END AS parte_a_morada,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.parte_b_nif
    ELSE NULL
  END AS parte_b_nif,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.parte_b_morada
    ELSE NULL
  END AS parte_b_morada,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.valor_total_estimado
    ELSE NULL
  END AS valor_total_estimado,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.estrutura_precos
    ELSE NULL
  END AS estrutura_precos,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.valor_anual_recorrente
    ELSE NULL
  END AS valor_anual_recorrente,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.prazo_pagamento_dias
    ELSE NULL
  END AS prazo_pagamento_dias,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.periodicidade_faturacao
    ELSE NULL
  END AS periodicidade_faturacao,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.moeda
    ELSE NULL
  END AS moeda,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.centro_custo
    ELSE NULL
  END AS centro_custo,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.numero_encomenda_po
    ELSE NULL
  END AS numero_encomenda_po,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.clausula_indemnizacao
    ELSE NULL
  END AS clausula_indemnizacao,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.clausula_indemnizacao_resumo
    ELSE NULL
  END AS clausula_indemnizacao_resumo,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.garantia_existente
    ELSE NULL
  END AS garantia_existente,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.garantia_tipo
    ELSE NULL
  END AS garantia_tipo,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.garantia_valor
    ELSE NULL
  END AS garantia_valor,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.garantia_data_validade
    ELSE NULL
  END AS garantia_data_validade,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.limite_responsabilidade
    ELSE NULL
  END AS limite_responsabilidade,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.contacto_comercial_nome
    ELSE NULL
  END AS contacto_comercial_nome,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.contacto_comercial_email
    ELSE NULL
  END AS contacto_comercial_email,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.contacto_comercial_telefone
    ELSE NULL
  END AS contacto_comercial_telefone,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.contacto_operacional_nome
    ELSE NULL
  END AS contacto_operacional_nome,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.contacto_operacional_email
    ELSE NULL
  END AS contacto_operacional_email,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.contacto_faturacao_nome
    ELSE NULL
  END AS contacto_faturacao_nome,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.contacto_faturacao_email
    ELSE NULL
  END AS contacto_faturacao_email,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.contacto_legal_nome
    ELSE NULL
  END AS contacto_legal_nome,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.contacto_legal_email
    ELSE NULL
  END AS contacto_legal_email,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.obrigacoes_parte_a
    ELSE NULL
  END AS obrigacoes_parte_a,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.obrigacoes_parte_b
    ELSE NULL
  END AS obrigacoes_parte_b,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.sla_kpi_resumo
    ELSE NULL
  END AS sla_kpi_resumo,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.prazos_denuncia_rescisao
    ELSE NULL
  END AS prazos_denuncia_rescisao,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.condicoes_subcontratacao
    ELSE NULL
  END AS condicoes_subcontratacao,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.categorias_dados_pessoais
    ELSE NULL
  END AS categorias_dados_pessoais,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.categorias_titulares
    ELSE NULL
  END AS categorias_titulares,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.paises_transferencia
    ELSE NULL
  END AS paises_transferencia,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.base_legal_transferencia
    ELSE NULL
  END AS base_legal_transferencia,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.referencia_dpa
    ELSE NULL
  END AS referencia_dpa,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.referencia_dpia
    ELSE NULL
  END AS referencia_dpia,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.aprovadores_internos
    ELSE NULL
  END AS aprovadores_internos,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.comentarios_aprovacao
    ELSE NULL
  END AS comentarios_aprovacao,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.ferramenta_assinatura
    ELSE NULL
  END AS ferramenta_assinatura,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.arquivo_storage_path
    ELSE NULL
  END AS arquivo_storage_path,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.arquivo_nome_original
    ELSE NULL
  END AS arquivo_nome_original,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.arquivo_mime_type
    ELSE NULL
  END AS arquivo_mime_type,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.extraido_json
    ELSE NULL
  END AS extraido_json,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.observacoes_ultima_revisao
    ELSE NULL
  END AS observacoes_ultima_revisao,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.contratos_relacionados
    ELSE NULL
  END AS contratos_relacionados,

  CASE
    WHEN is_platform_admin(auth.uid()) 
         OR get_user_org_role(auth.uid(), c.organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role, 'editor'::app_role])
    THEN c.motivo_ultima_alteracao
    ELSE NULL
  END AS motivo_ultima_alteracao

FROM contratos c
WHERE c.organization_id = get_user_organization_id(auth.uid()) 
   OR is_platform_admin(auth.uid());