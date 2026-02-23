-- Create a view for contracts that restricts sensitive financial and commercial data for viewers
-- Viewers can see contract metadata but not sensitive financial details

CREATE OR REPLACE VIEW public.contratos_safe
WITH (security_invoker=on) AS
SELECT 
    id,
    id_interno,
    titulo_contrato,
    objeto_resumido,
    tipo_contrato,
    tipo_contrato_personalizado,
    estado_contrato,
    estado_aprovacao,
    departamento_responsavel,
    responsavel_interno_id,
    responsavel_revisao_renovacao_id,
    data_assinatura_parte_a,
    data_assinatura_parte_b,
    data_inicio_vigencia,
    data_termo,
    tipo_duracao,
    tipo_renovacao,
    renovacao_periodo_meses,
    aviso_previo_nao_renovacao_dias,
    data_conclusao_assinatura,
    data_limite_decisao_renovacao,
    alerta_renovacao_90_dias,
    alerta_renovacao_60_dias,
    alerta_renovacao_30_dias,
    resultado_ultima_revisao,
    numero_adendas,
    versao_actual,
    arquivado,
    -- Flags (non-sensitive)
    flag_confidencialidade,
    flag_nao_concorrencia,
    flag_exclusividade,
    flag_direito_subcontratar,
    tratamento_dados_pessoais,
    papel_entidade,
    transferencia_internacional,
    existe_dpa_anexo_rgpd,
    dpia_realizada,
    metodo_assinatura,
    areas_direito_aplicaveis,
    -- Timestamps
    created_at,
    updated_at,
    created_by_id,
    updated_by_id,
    organization_id,
    iniciado_por_id,
    -- Party A public info - only names, not NIFs or addresses
    parte_a_nome_legal,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN parte_a_nif
        ELSE NULL::text
    END AS parte_a_nif,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN parte_a_morada
        ELSE NULL::text
    END AS parte_a_morada,
    parte_a_pais,
    -- Party B public info
    parte_b_nome_legal,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN parte_b_nif
        ELSE NULL::text
    END AS parte_b_nif,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN parte_b_morada
        ELSE NULL::text
    END AS parte_b_morada,
    parte_b_pais,
    parte_b_grupo_economico,
    -- Financial data - hidden from viewers
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN valor_total_estimado
        ELSE NULL::numeric
    END AS valor_total_estimado,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN estrutura_precos
        ELSE NULL::estrutura_precos
    END AS estrutura_precos,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN valor_anual_recorrente
        ELSE NULL::numeric
    END AS valor_anual_recorrente,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN prazo_pagamento_dias
        ELSE NULL::integer
    END AS prazo_pagamento_dias,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN periodicidade_faturacao
        ELSE NULL::periodicidade_faturacao
    END AS periodicidade_faturacao,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN moeda
        ELSE NULL::text
    END AS moeda,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN centro_custo
        ELSE NULL::text
    END AS centro_custo,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN numero_encomenda_po
        ELSE NULL::text
    END AS numero_encomenda_po,
    -- Guarantee data - hidden from viewers
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN clausula_indemnizacao
        ELSE NULL::boolean
    END AS clausula_indemnizacao,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN clausula_indemnizacao_resumo
        ELSE NULL::text
    END AS clausula_indemnizacao_resumo,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN garantia_existente
        ELSE NULL::boolean
    END AS garantia_existente,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN garantia_tipo
        ELSE NULL::tipo_garantia
    END AS garantia_tipo,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN garantia_valor
        ELSE NULL::numeric
    END AS garantia_valor,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN garantia_data_validade
        ELSE NULL::date
    END AS garantia_data_validade,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN limite_responsabilidade
        ELSE NULL::text
    END AS limite_responsabilidade,
    -- Contact details - hidden from viewers (PII)
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN contacto_comercial_nome
        ELSE NULL::text
    END AS contacto_comercial_nome,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN contacto_comercial_email
        ELSE NULL::text
    END AS contacto_comercial_email,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN contacto_comercial_telefone
        ELSE NULL::text
    END AS contacto_comercial_telefone,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN contacto_operacional_nome
        ELSE NULL::text
    END AS contacto_operacional_nome,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN contacto_operacional_email
        ELSE NULL::text
    END AS contacto_operacional_email,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN contacto_faturacao_nome
        ELSE NULL::text
    END AS contacto_faturacao_nome,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN contacto_faturacao_email
        ELSE NULL::text
    END AS contacto_faturacao_email,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN contacto_legal_nome
        ELSE NULL::text
    END AS contacto_legal_nome,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN contacto_legal_email
        ELSE NULL::text
    END AS contacto_legal_email,
    -- Obligations and SLA - hidden from viewers
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN obrigacoes_parte_a
        ELSE NULL::text
    END AS obrigacoes_parte_a,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN obrigacoes_parte_b
        ELSE NULL::text
    END AS obrigacoes_parte_b,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN sla_kpi_resumo
        ELSE NULL::text
    END AS sla_kpi_resumo,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN prazos_denuncia_rescisao
        ELSE NULL::text
    END AS prazos_denuncia_rescisao,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN condicoes_subcontratacao
        ELSE NULL::text
    END AS condicoes_subcontratacao,
    -- GDPR/Data protection - hidden from viewers
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN categorias_dados_pessoais
        ELSE NULL::text
    END AS categorias_dados_pessoais,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN categorias_titulares
        ELSE NULL::text
    END AS categorias_titulares,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN paises_transferencia
        ELSE NULL::text
    END AS paises_transferencia,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN base_legal_transferencia
        ELSE NULL::text
    END AS base_legal_transferencia,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN referencia_dpa
        ELSE NULL::text
    END AS referencia_dpa,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN referencia_dpia
        ELSE NULL::text
    END AS referencia_dpia,
    -- Approval flow - hidden from viewers
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN aprovadores_internos
        ELSE NULL::text
    END AS aprovadores_internos,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN comentarios_aprovacao
        ELSE NULL::text
    END AS comentarios_aprovacao,
    -- File and signature info
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN ferramenta_assinatura
        ELSE NULL::text
    END AS ferramenta_assinatura,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN arquivo_storage_path
        ELSE NULL::text
    END AS arquivo_storage_path,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN arquivo_nome_original
        ELSE NULL::text
    END AS arquivo_nome_original,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN arquivo_mime_type
        ELSE NULL::text
    END AS arquivo_mime_type,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN extraido_json
        ELSE NULL::jsonb
    END AS extraido_json,
    -- Revision notes
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN observacoes_ultima_revisao
        ELSE NULL::text
    END AS observacoes_ultima_revisao,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN contratos_relacionados
        ELSE NULL::text
    END AS contratos_relacionados,
    CASE 
        WHEN get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
        THEN motivo_ultima_alteracao
        ELSE NULL::text
    END AS motivo_ultima_alteracao
FROM public.contratos
WHERE (organization_id = get_user_organization_id(auth.uid())) OR is_platform_admin(auth.uid());

-- Add comment explaining the view
COMMENT ON VIEW public.contratos_safe IS 'Secure view for contracts that hides sensitive financial and commercial data from viewers. Only owners, admins, and editors can see full contract details. Viewers see only contract metadata (title, status, dates, parties names).';

-- Grant access to the view
GRANT SELECT ON public.contratos_safe TO authenticated;