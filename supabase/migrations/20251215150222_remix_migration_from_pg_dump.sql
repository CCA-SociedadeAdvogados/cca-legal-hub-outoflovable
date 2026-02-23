CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'owner',
    'admin',
    'editor',
    'viewer'
);


--
-- Name: area_direito; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.area_direito AS ENUM (
    'laboral',
    'fiscal',
    'comercial',
    'protecao_dados',
    'ambiente',
    'seguranca_trabalho',
    'societario',
    'outro'
);


--
-- Name: departamento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.departamento AS ENUM (
    'comercial',
    'operacoes',
    'it',
    'rh',
    'financeiro',
    'juridico',
    'marketing',
    'outro'
);


--
-- Name: estado_aprovacao; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_aprovacao AS ENUM (
    'pendente',
    'aprovado',
    'rejeitado'
);


--
-- Name: estado_contrato; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_contrato AS ENUM (
    'rascunho',
    'em_revisao',
    'em_aprovacao',
    'enviado_para_assinatura',
    'activo',
    'expirado',
    'denunciado',
    'rescindido'
);


--
-- Name: estado_evento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_evento AS ENUM (
    'rascunho',
    'activo',
    'arquivado'
);


--
-- Name: estado_impacto; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_impacto AS ENUM (
    'pendente_analise',
    'em_tratamento',
    'resolvido',
    'ignorado'
);


--
-- Name: estrutura_precos; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estrutura_precos AS ENUM (
    'fixo',
    'hora',
    'unidade',
    'success_fee',
    'misto'
);


--
-- Name: jurisdicao; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.jurisdicao AS ENUM (
    'nacional',
    'europeia',
    'internacional'
);


--
-- Name: metodo_assinatura; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.metodo_assinatura AS ENUM (
    'assinatura_digital_qualificada',
    'assinatura_avancada',
    'assinatura_simples',
    'manuscrita'
);


--
-- Name: nivel_risco; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nivel_risco AS ENUM (
    'baixo',
    'medio',
    'alto'
);


--
-- Name: papel_entidade; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.papel_entidade AS ENUM (
    'responsavel_tratamento',
    'subcontratante',
    'corresponsavel'
);


--
-- Name: periodicidade_faturacao; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.periodicidade_faturacao AS ENUM (
    'mensal',
    'trimestral',
    'semestral',
    'anual',
    'por_marco',
    'a_cabeca'
);


--
-- Name: resultado_revisao; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.resultado_revisao AS ENUM (
    'renovado',
    'renegociado',
    'terminado'
);


--
-- Name: tipo_anexo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_anexo AS ENUM (
    'pdf_principal',
    'anexo',
    'adenda',
    'outro'
);


--
-- Name: tipo_contrato; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_contrato AS ENUM (
    'nda',
    'prestacao_servicos',
    'fornecimento',
    'saas',
    'arrendamento',
    'trabalho',
    'licenciamento',
    'parceria',
    'consultoria',
    'outro'
);


--
-- Name: tipo_duracao; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_duracao AS ENUM (
    'prazo_determinado',
    'prazo_indeterminado'
);


--
-- Name: tipo_evento_ciclo_vida; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_evento_ciclo_vida AS ENUM (
    'criacao',
    'assinatura',
    'inicio_vigencia',
    'renovacao',
    'adenda',
    'rescisao',
    'denuncia',
    'expiracao',
    'nota_interna',
    'alteracao'
);


--
-- Name: tipo_garantia; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_garantia AS ENUM (
    'garantia_bancaria',
    'seguro_caucao',
    'deposito',
    'outro'
);


--
-- Name: tipo_renovacao; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_renovacao AS ENUM (
    'sem_renovacao_automatica',
    'renovacao_automatica',
    'renovacao_mediante_acordo'
);


--
-- Name: audit_trigger_function(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_trigger_function() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'CREATE',
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('trigger', true)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('trigger', true)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      NULL,
      jsonb_build_object('trigger', true)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: get_user_org_role(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_org_role(_user_id uuid, _org_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.organization_members
  WHERE user_id = _user_id AND organization_id = _org_id
$$;


--
-- Name: get_user_organization_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_organization_id(_user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT current_organization_id FROM public.profiles WHERE id = _user_id
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome_completo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome_completo', NEW.email)
  );
  RETURN NEW;
END;
$$;


--
-- Name: log_audit_event(text, text, uuid, jsonb, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_audit_event(_action text, _table_name text, _record_id uuid DEFAULT NULL::uuid, _old_data jsonb DEFAULT NULL::jsonb, _new_data jsonb DEFAULT NULL::jsonb, _metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _user_id uuid;
  _user_email text;
  _org_id uuid;
  _log_id uuid;
BEGIN
  _user_id := auth.uid();
  
  -- Obter email do utilizador
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  -- Obter organização atual
  SELECT current_organization_id INTO _org_id FROM public.profiles WHERE id = _user_id;
  
  -- Inserir log
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    user_email,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    metadata
  ) VALUES (
    _org_id,
    _user_id,
    _user_email,
    _action,
    _table_name,
    _record_id,
    _old_data,
    _new_data,
    _metadata
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: user_belongs_to_organization(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_belongs_to_organization(_user_id uuid, _org_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;


--
-- Name: user_has_org_role(uuid, uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_org_role(_user_id uuid, _org_id uuid, _min_role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id 
      AND organization_id = _org_id
      AND role IN ('owner', 'admin', 'editor')
  )
$$;


SET default_table_access_method = heap;

--
-- Name: anexos_contrato; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anexos_contrato (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contrato_id uuid NOT NULL,
    nome_ficheiro text NOT NULL,
    tipo_anexo public.tipo_anexo DEFAULT 'outro'::public.tipo_anexo NOT NULL,
    descricao text,
    url_ficheiro text NOT NULL,
    tamanho_bytes bigint,
    mime_type text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    uploaded_by_id uuid
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    user_id uuid NOT NULL,
    user_email text,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contratos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contratos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_interno text NOT NULL,
    titulo_contrato text NOT NULL,
    tipo_contrato public.tipo_contrato DEFAULT 'outro'::public.tipo_contrato NOT NULL,
    objeto_resumido text,
    estado_contrato public.estado_contrato DEFAULT 'rascunho'::public.estado_contrato NOT NULL,
    departamento_responsavel public.departamento DEFAULT 'outro'::public.departamento NOT NULL,
    responsavel_interno_id uuid,
    parte_a_nome_legal text NOT NULL,
    parte_a_nif text,
    parte_a_morada text,
    parte_a_pais text DEFAULT 'Portugal'::text,
    parte_b_nome_legal text NOT NULL,
    parte_b_nif text,
    parte_b_grupo_economico text,
    parte_b_morada text,
    parte_b_pais text DEFAULT 'Portugal'::text,
    contacto_comercial_nome text,
    contacto_comercial_email text,
    contacto_comercial_telefone text,
    contacto_operacional_nome text,
    contacto_operacional_email text,
    contacto_faturacao_nome text,
    contacto_faturacao_email text,
    contacto_legal_nome text,
    contacto_legal_email text,
    data_assinatura_parte_a date,
    data_assinatura_parte_b date,
    data_inicio_vigencia date,
    data_termo date,
    tipo_duracao public.tipo_duracao DEFAULT 'prazo_determinado'::public.tipo_duracao NOT NULL,
    tipo_renovacao public.tipo_renovacao DEFAULT 'sem_renovacao_automatica'::public.tipo_renovacao NOT NULL,
    renovacao_periodo_meses integer,
    aviso_previo_nao_renovacao_dias integer DEFAULT 30,
    prazos_denuncia_rescisao text,
    valor_total_estimado numeric(15,2),
    moeda text DEFAULT 'EUR'::text,
    estrutura_precos public.estrutura_precos DEFAULT 'fixo'::public.estrutura_precos,
    valor_anual_recorrente numeric(15,2),
    prazo_pagamento_dias integer DEFAULT 30,
    periodicidade_faturacao public.periodicidade_faturacao,
    centro_custo text,
    numero_encomenda_po text,
    obrigacoes_parte_a text,
    obrigacoes_parte_b text,
    sla_kpi_resumo text,
    limite_responsabilidade text,
    clausula_indemnizacao boolean DEFAULT false,
    clausula_indemnizacao_resumo text,
    garantia_existente boolean DEFAULT false,
    garantia_tipo public.tipo_garantia,
    garantia_valor numeric(15,2),
    garantia_data_validade date,
    flag_confidencialidade boolean DEFAULT false,
    flag_nao_concorrencia boolean DEFAULT false,
    flag_exclusividade boolean DEFAULT false,
    flag_direito_subcontratar boolean DEFAULT false,
    condicoes_subcontratacao text,
    tratamento_dados_pessoais boolean DEFAULT false,
    categorias_dados_pessoais text,
    categorias_titulares text,
    papel_entidade public.papel_entidade,
    transferencia_internacional boolean DEFAULT false,
    paises_transferencia text,
    base_legal_transferencia text,
    existe_dpa_anexo_rgpd boolean DEFAULT false,
    referencia_dpa text,
    dpia_realizada boolean DEFAULT false,
    referencia_dpia text,
    iniciado_por_id uuid,
    aprovadores_internos text,
    estado_aprovacao public.estado_aprovacao DEFAULT 'pendente'::public.estado_aprovacao,
    comentarios_aprovacao text,
    metodo_assinatura public.metodo_assinatura,
    ferramenta_assinatura text,
    data_conclusao_assinatura date,
    data_limite_decisao_renovacao date,
    responsavel_revisao_renovacao_id uuid,
    alerta_renovacao_90_dias boolean DEFAULT true,
    alerta_renovacao_60_dias boolean DEFAULT true,
    alerta_renovacao_30_dias boolean DEFAULT true,
    resultado_ultima_revisao public.resultado_revisao,
    observacoes_ultima_revisao text,
    numero_adendas integer DEFAULT 0,
    contratos_relacionados text,
    versao_actual integer DEFAULT 1,
    motivo_ultima_alteracao text,
    arquivado boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid,
    areas_direito_aplicaveis text[] DEFAULT '{}'::text[],
    tipo_contrato_personalizado text
);


--
-- Name: documentos_gerados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentos_gerados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    nome text NOT NULL,
    tipo text DEFAULT 'outro'::text NOT NULL,
    url_ficheiro text,
    tamanho_bytes bigint,
    mime_type text,
    estado_assinatura text DEFAULT 'pendente'::text NOT NULL,
    assinantes jsonb DEFAULT '[]'::jsonb,
    template_id uuid,
    contrato_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_id uuid,
    CONSTRAINT documentos_gerados_estado_assinatura_check CHECK ((estado_assinatura = ANY (ARRAY['pendente'::text, 'enviado'::text, 'assinado'::text, 'recusado'::text, 'expirado'::text]))),
    CONSTRAINT documentos_gerados_tipo_check CHECK ((tipo = ANY (ARRAY['contrato'::text, 'adenda'::text, 'politica'::text, 'comunicacao'::text, 'outro'::text])))
);


--
-- Name: eventos_ciclo_vida_contrato; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eventos_ciclo_vida_contrato (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contrato_id uuid NOT NULL,
    tipo_evento public.tipo_evento_ciclo_vida NOT NULL,
    data_evento date DEFAULT CURRENT_DATE NOT NULL,
    descricao text,
    criado_por_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: eventos_legislativos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eventos_legislativos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text NOT NULL,
    referencia_legal text,
    descricao_resumo text,
    area_direito public.area_direito DEFAULT 'outro'::public.area_direito NOT NULL,
    jurisdicao public.jurisdicao DEFAULT 'nacional'::public.jurisdicao NOT NULL,
    estado public.estado_evento DEFAULT 'rascunho'::public.estado_evento NOT NULL,
    data_publicacao date,
    data_entrada_vigor date,
    link_oficial text,
    tags text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid
);


--
-- Name: impactos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.impactos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evento_legislativo_id uuid NOT NULL,
    contrato_id uuid,
    nivel_risco public.nivel_risco DEFAULT 'medio'::public.nivel_risco NOT NULL,
    estado public.estado_impacto DEFAULT 'pendente_analise'::public.estado_impacto NOT NULL,
    descricao text,
    observacoes text,
    data_identificacao date DEFAULT CURRENT_DATE NOT NULL,
    data_resolucao date,
    resolvido_por_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_id uuid,
    organization_id uuid
);


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'viewer'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organization_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    current_period_start timestamp with time zone DEFAULT now(),
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: politicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.politicas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    titulo text NOT NULL,
    descricao text,
    conteudo text,
    estado text DEFAULT 'rascunho'::text NOT NULL,
    versao integer DEFAULT 1 NOT NULL,
    departamento text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_id uuid,
    updated_by_id uuid,
    CONSTRAINT politicas_estado_check CHECK ((estado = ANY (ARRAY['rascunho'::text, 'em_revisao'::text, 'aprovada'::text, 'arquivada'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    nome_completo text,
    email text,
    avatar_url text,
    departamento public.departamento,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    current_organization_id uuid,
    onboarding_completed boolean DEFAULT false
);


--
-- Name: requisitos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requisitos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    titulo text NOT NULL,
    descricao text,
    fonte_legal text,
    area_direito text DEFAULT 'outro'::text NOT NULL,
    prazo_cumprimento date,
    estado text DEFAULT 'pendente'::text NOT NULL,
    nivel_criticidade text DEFAULT 'medio'::text NOT NULL,
    evento_legislativo_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_id uuid,
    CONSTRAINT requisitos_estado_check CHECK ((estado = ANY (ARRAY['pendente'::text, 'em_curso'::text, 'cumprido'::text, 'nao_aplicavel'::text]))),
    CONSTRAINT requisitos_nivel_criticidade_check CHECK ((nivel_criticidade = ANY (ARRAY['baixo'::text, 'medio'::text, 'alto'::text, 'critico'::text])))
);


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    price_monthly numeric DEFAULT 0,
    price_yearly numeric DEFAULT 0,
    currency text DEFAULT 'EUR'::text,
    is_active boolean DEFAULT true,
    features jsonb DEFAULT '[]'::jsonb,
    limits jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    nome text NOT NULL,
    descricao text,
    tipo text DEFAULT 'outro'::text NOT NULL,
    conteudo text DEFAULT ''::text NOT NULL,
    placeholders text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_id uuid,
    updated_by_id uuid,
    CONSTRAINT templates_tipo_check CHECK ((tipo = ANY (ARRAY['contrato'::text, 'adenda'::text, 'politica'::text, 'comunicacao'::text, 'outro'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Name: anexos_contrato anexos_contrato_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anexos_contrato
    ADD CONSTRAINT anexos_contrato_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: contratos contratos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_pkey PRIMARY KEY (id);


--
-- Name: documentos_gerados documentos_gerados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_gerados
    ADD CONSTRAINT documentos_gerados_pkey PRIMARY KEY (id);


--
-- Name: eventos_ciclo_vida_contrato eventos_ciclo_vida_contrato_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_ciclo_vida_contrato
    ADD CONSTRAINT eventos_ciclo_vida_contrato_pkey PRIMARY KEY (id);


--
-- Name: eventos_legislativos eventos_legislativos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_legislativos
    ADD CONSTRAINT eventos_legislativos_pkey PRIMARY KEY (id);


--
-- Name: impactos impactos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impactos
    ADD CONSTRAINT impactos_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_organization_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organization_subscriptions organization_subscriptions_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_subscriptions
    ADD CONSTRAINT organization_subscriptions_organization_id_key UNIQUE (organization_id);


--
-- Name: organization_subscriptions organization_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_subscriptions
    ADD CONSTRAINT organization_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: politicas politicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.politicas
    ADD CONSTRAINT politicas_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: requisitos requisitos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisitos
    ADD CONSTRAINT requisitos_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_slug_key UNIQUE (slug);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_organization ON public.audit_logs USING btree (organization_id);


--
-- Name: idx_audit_logs_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_record ON public.audit_logs USING btree (record_id);


--
-- Name: idx_audit_logs_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_table ON public.audit_logs USING btree (table_name);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: contratos audit_contratos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_contratos AFTER INSERT OR DELETE OR UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: documentos_gerados audit_documentos_gerados; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_documentos_gerados AFTER INSERT OR DELETE OR UPDATE ON public.documentos_gerados FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: eventos_legislativos audit_eventos_legislativos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_eventos_legislativos AFTER INSERT OR DELETE OR UPDATE ON public.eventos_legislativos FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: impactos audit_impactos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_impactos AFTER INSERT OR DELETE OR UPDATE ON public.impactos FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: politicas audit_politicas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_politicas AFTER INSERT OR DELETE OR UPDATE ON public.politicas FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: requisitos audit_requisitos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_requisitos AFTER INSERT OR DELETE OR UPDATE ON public.requisitos FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: templates audit_templates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_templates AFTER INSERT OR DELETE OR UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: contratos update_contratos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: eventos_legislativos update_eventos_legislativos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_eventos_legislativos_updated_at BEFORE UPDATE ON public.eventos_legislativos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: impactos update_impactos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_impactos_updated_at BEFORE UPDATE ON public.impactos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organization_subscriptions update_organization_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organization_subscriptions_updated_at BEFORE UPDATE ON public.organization_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: politicas update_politicas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_politicas_updated_at BEFORE UPDATE ON public.politicas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: requisitos update_requisitos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_requisitos_updated_at BEFORE UPDATE ON public.requisitos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscription_plans update_subscription_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: templates update_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: anexos_contrato anexos_contrato_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anexos_contrato
    ADD CONSTRAINT anexos_contrato_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: anexos_contrato anexos_contrato_uploaded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anexos_contrato
    ADD CONSTRAINT anexos_contrato_uploaded_by_id_fkey FOREIGN KEY (uploaded_by_id) REFERENCES public.profiles(id);


--
-- Name: audit_logs audit_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: contratos contratos_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.profiles(id);


--
-- Name: contratos contratos_iniciado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_iniciado_por_id_fkey FOREIGN KEY (iniciado_por_id) REFERENCES public.profiles(id);


--
-- Name: contratos contratos_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: contratos contratos_responsavel_interno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_responsavel_interno_id_fkey FOREIGN KEY (responsavel_interno_id) REFERENCES public.profiles(id);


--
-- Name: contratos contratos_responsavel_revisao_renovacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_responsavel_revisao_renovacao_id_fkey FOREIGN KEY (responsavel_revisao_renovacao_id) REFERENCES public.profiles(id);


--
-- Name: contratos contratos_updated_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_updated_by_id_fkey FOREIGN KEY (updated_by_id) REFERENCES public.profiles(id);


--
-- Name: documentos_gerados documentos_gerados_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_gerados
    ADD CONSTRAINT documentos_gerados_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE SET NULL;


--
-- Name: documentos_gerados documentos_gerados_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_gerados
    ADD CONSTRAINT documentos_gerados_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.profiles(id);


--
-- Name: documentos_gerados documentos_gerados_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_gerados
    ADD CONSTRAINT documentos_gerados_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: documentos_gerados documentos_gerados_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_gerados
    ADD CONSTRAINT documentos_gerados_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE SET NULL;


--
-- Name: eventos_ciclo_vida_contrato eventos_ciclo_vida_contrato_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_ciclo_vida_contrato
    ADD CONSTRAINT eventos_ciclo_vida_contrato_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: eventos_ciclo_vida_contrato eventos_ciclo_vida_contrato_criado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_ciclo_vida_contrato
    ADD CONSTRAINT eventos_ciclo_vida_contrato_criado_por_id_fkey FOREIGN KEY (criado_por_id) REFERENCES public.profiles(id);


--
-- Name: eventos_legislativos eventos_legislativos_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_legislativos
    ADD CONSTRAINT eventos_legislativos_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.profiles(id);


--
-- Name: eventos_legislativos eventos_legislativos_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_legislativos
    ADD CONSTRAINT eventos_legislativos_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: eventos_legislativos eventos_legislativos_updated_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_legislativos
    ADD CONSTRAINT eventos_legislativos_updated_by_id_fkey FOREIGN KEY (updated_by_id) REFERENCES public.profiles(id);


--
-- Name: impactos impactos_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impactos
    ADD CONSTRAINT impactos_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE SET NULL;


--
-- Name: impactos impactos_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impactos
    ADD CONSTRAINT impactos_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.profiles(id);


--
-- Name: impactos impactos_evento_legislativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impactos
    ADD CONSTRAINT impactos_evento_legislativo_id_fkey FOREIGN KEY (evento_legislativo_id) REFERENCES public.eventos_legislativos(id) ON DELETE CASCADE;


--
-- Name: impactos impactos_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impactos
    ADD CONSTRAINT impactos_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: impactos impactos_resolvido_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impactos
    ADD CONSTRAINT impactos_resolvido_por_id_fkey FOREIGN KEY (resolvido_por_id) REFERENCES public.profiles(id);


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: organization_subscriptions organization_subscriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_subscriptions
    ADD CONSTRAINT organization_subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_subscriptions organization_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_subscriptions
    ADD CONSTRAINT organization_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: politicas politicas_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.politicas
    ADD CONSTRAINT politicas_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.profiles(id);


--
-- Name: politicas politicas_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.politicas
    ADD CONSTRAINT politicas_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: politicas politicas_updated_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.politicas
    ADD CONSTRAINT politicas_updated_by_id_fkey FOREIGN KEY (updated_by_id) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_current_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_current_organization_id_fkey FOREIGN KEY (current_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: requisitos requisitos_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisitos
    ADD CONSTRAINT requisitos_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.profiles(id);


--
-- Name: requisitos requisitos_evento_legislativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisitos
    ADD CONSTRAINT requisitos_evento_legislativo_id_fkey FOREIGN KEY (evento_legislativo_id) REFERENCES public.eventos_legislativos(id) ON DELETE SET NULL;


--
-- Name: requisitos requisitos_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisitos
    ADD CONSTRAINT requisitos_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: templates templates_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.profiles(id);


--
-- Name: templates templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: templates templates_updated_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_updated_by_id_fkey FOREIGN KEY (updated_by_id) REFERENCES public.profiles(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: contratos Admins can delete contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete contracts" ON public.contratos FOR DELETE USING (((organization_id = public.get_user_organization_id(auth.uid())) AND (public.get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))));


--
-- Name: documentos_gerados Admins can delete documentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete documentos" ON public.documentos_gerados FOR DELETE USING (((organization_id = public.get_user_organization_id(auth.uid())) AND (public.get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))));


--
-- Name: eventos_legislativos Admins can delete eventos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete eventos" ON public.eventos_legislativos FOR DELETE USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: impactos Admins can delete impactos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete impactos" ON public.impactos FOR DELETE USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: politicas Admins can delete politicas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete politicas" ON public.politicas FOR DELETE USING (((organization_id = public.get_user_organization_id(auth.uid())) AND (public.get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))));


--
-- Name: requisitos Admins can delete requisitos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete requisitos" ON public.requisitos FOR DELETE USING (((organization_id = public.get_user_organization_id(auth.uid())) AND (public.get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))));


--
-- Name: templates Admins can delete templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete templates" ON public.templates FOR DELETE USING (((organization_id = public.get_user_organization_id(auth.uid())) AND (public.get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))));


--
-- Name: organization_members Admins can manage members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage members" ON public.organization_members USING ((public.get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role])));


--
-- Name: audit_logs Admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (((organization_id = public.get_user_organization_id(auth.uid())) AND (public.get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))));


--
-- Name: subscription_plans Anyone can view active subscription plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plans FOR SELECT USING ((is_active = true));


--
-- Name: anexos_contrato Authenticated users can delete attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete attachments" ON public.anexos_contrato FOR DELETE TO authenticated USING (true);


--
-- Name: anexos_contrato Authenticated users can insert attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert attachments" ON public.anexos_contrato FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: eventos_ciclo_vida_contrato Authenticated users can insert lifecycle events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert lifecycle events" ON public.eventos_ciclo_vida_contrato FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: anexos_contrato Authenticated users can update attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update attachments" ON public.anexos_contrato FOR UPDATE TO authenticated USING (true);


--
-- Name: anexos_contrato Authenticated users can view attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view attachments" ON public.anexos_contrato FOR SELECT TO authenticated USING (true);


--
-- Name: eventos_ciclo_vida_contrato Authenticated users can view lifecycle events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view lifecycle events" ON public.eventos_ciclo_vida_contrato FOR SELECT TO authenticated USING (true);


--
-- Name: contratos Editors can insert contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can insert contracts" ON public.contratos FOR INSERT WITH CHECK ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: documentos_gerados Editors can insert documentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can insert documentos" ON public.documentos_gerados FOR INSERT WITH CHECK ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: eventos_legislativos Editors can insert eventos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can insert eventos" ON public.eventos_legislativos FOR INSERT WITH CHECK ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: impactos Editors can insert impactos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can insert impactos" ON public.impactos FOR INSERT WITH CHECK ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: politicas Editors can insert politicas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can insert politicas" ON public.politicas FOR INSERT WITH CHECK ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: requisitos Editors can insert requisitos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can insert requisitos" ON public.requisitos FOR INSERT WITH CHECK ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: templates Editors can insert templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can insert templates" ON public.templates FOR INSERT WITH CHECK ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: contratos Editors can update contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can update contracts" ON public.contratos FOR UPDATE USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: documentos_gerados Editors can update documentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can update documentos" ON public.documentos_gerados FOR UPDATE USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: eventos_legislativos Editors can update eventos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can update eventos" ON public.eventos_legislativos FOR UPDATE USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: impactos Editors can update impactos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can update impactos" ON public.impactos FOR UPDATE USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: politicas Editors can update politicas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can update politicas" ON public.politicas FOR UPDATE USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: requisitos Editors can update requisitos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can update requisitos" ON public.requisitos FOR UPDATE USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: templates Editors can update templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editors can update templates" ON public.templates FOR UPDATE USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: user_roles Owners and admins can manage roles in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and admins can manage roles in their organization" ON public.user_roles USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role])) AND (EXISTS ( SELECT 1
           FROM public.organization_members target_om
          WHERE ((target_om.user_id = user_roles.user_id) AND (target_om.organization_id = om.organization_id)))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: organization_subscriptions Owners can manage their organization subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage their organization subscription" ON public.organization_subscriptions USING (((organization_id = public.get_user_organization_id(auth.uid())) AND (public.get_user_org_role(auth.uid(), organization_id) = 'owner'::public.app_role)));


--
-- Name: organizations Owners can update their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can update their organization" ON public.organizations FOR UPDATE USING ((public.get_user_org_role(auth.uid(), id) = 'owner'::public.app_role));


--
-- Name: audit_logs System can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);


--
-- Name: anexos_contrato Users can delete contract attachments in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete contract attachments in their organization" ON public.anexos_contrato FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.contratos c
     JOIN public.organization_members om ON ((c.organization_id = om.organization_id)))
  WHERE ((c.id = anexos_contrato.contrato_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: anexos_contrato Users can insert contract attachments in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert contract attachments in their organization" ON public.anexos_contrato FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.contratos c
     JOIN public.organization_members om ON ((c.organization_id = om.organization_id)))
  WHERE ((c.id = anexos_contrato.contrato_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role, 'editor'::public.app_role]))))));


--
-- Name: eventos_ciclo_vida_contrato Users can insert lifecycle events in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert lifecycle events in their organization" ON public.eventos_ciclo_vida_contrato FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.contratos c
     JOIN public.organization_members om ON ((c.organization_id = om.organization_id)))
  WHERE ((c.id = eventos_ciclo_vida_contrato.contrato_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role, 'editor'::public.app_role]))))));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: anexos_contrato Users can update contract attachments in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update contract attachments in their organization" ON public.anexos_contrato FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.contratos c
     JOIN public.organization_members om ON ((c.organization_id = om.organization_id)))
  WHERE ((c.id = anexos_contrato.contrato_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role, 'editor'::public.app_role]))))));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: anexos_contrato Users can view contract attachments in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view contract attachments in their organization" ON public.anexos_contrato FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.contratos c
     JOIN public.organization_members om ON ((c.organization_id = om.organization_id)))
  WHERE ((c.id = anexos_contrato.contrato_id) AND (om.user_id = auth.uid())))));


--
-- Name: contratos Users can view contracts in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view contracts in their organization" ON public.contratos FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: documentos_gerados Users can view documentos in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view documentos in their organization" ON public.documentos_gerados FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: eventos_legislativos Users can view eventos in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view eventos in their organization" ON public.eventos_legislativos FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: impactos Users can view impactos in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view impactos in their organization" ON public.impactos FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: eventos_ciclo_vida_contrato Users can view lifecycle events in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view lifecycle events in their organization" ON public.eventos_ciclo_vida_contrato FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.contratos c
     JOIN public.organization_members om ON ((c.organization_id = om.organization_id)))
  WHERE ((c.id = eventos_ciclo_vida_contrato.contrato_id) AND (om.user_id = auth.uid())))));


--
-- Name: organization_members Users can view members of their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view members of their organizations" ON public.organization_members FOR SELECT USING (public.user_belongs_to_organization(auth.uid(), organization_id));


--
-- Name: politicas Users can view politicas in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view politicas in their organization" ON public.politicas FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: profiles Users can view profiles in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view profiles in their organization" ON public.profiles FOR SELECT USING (((current_organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))) OR (id = auth.uid())));


--
-- Name: requisitos Users can view requisitos in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view requisitos in their organization" ON public.requisitos FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: templates Users can view templates in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view templates in their organization" ON public.templates FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: organization_subscriptions Users can view their organization subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization subscription" ON public.organization_subscriptions FOR SELECT USING ((organization_id = public.get_user_organization_id(auth.uid())));


--
-- Name: organizations Users can view their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organizations" ON public.organizations FOR SELECT USING (public.user_belongs_to_organization(auth.uid(), id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: anexos_contrato; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.anexos_contrato ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: contratos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

--
-- Name: documentos_gerados; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documentos_gerados ENABLE ROW LEVEL SECURITY;

--
-- Name: eventos_ciclo_vida_contrato; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.eventos_ciclo_vida_contrato ENABLE ROW LEVEL SECURITY;

--
-- Name: eventos_legislativos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.eventos_legislativos ENABLE ROW LEVEL SECURITY;

--
-- Name: impactos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.impactos ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: politicas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.politicas ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: requisitos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requisitos ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


