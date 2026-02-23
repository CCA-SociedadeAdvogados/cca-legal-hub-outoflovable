-- ============================================
-- FASE 5: Criar tabelas para Novidades CCA e Financeiro
-- ============================================

-- 1) Tabela de Novidades CCA
CREATE TABLE public.cca_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  resumo text,
  conteudo text NOT NULL,
  estado text NOT NULL DEFAULT 'rascunho' CHECK (estado IN ('rascunho', 'publicado', 'arquivado')),
  data_publicacao timestamptz,
  anexos jsonb DEFAULT '[]',
  links jsonb DEFAULT '[]',
  created_by_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_cca_news_updated_at
  BEFORE UPDATE ON public.cca_news
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para cca_news
ALTER TABLE public.cca_news ENABLE ROW LEVEL SECURITY;

-- Leitura: todos autenticados podem ver publicados, platform admins vêem tudo
CREATE POLICY "Read published news or all for platform admins"
ON public.cca_news FOR SELECT TO authenticated
USING (estado = 'publicado' OR is_platform_admin(auth.uid()));

-- Escrita: apenas Platform Admins
CREATE POLICY "Platform admins can insert news"
ON public.cca_news FOR INSERT TO authenticated
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update news"
ON public.cca_news FOR UPDATE TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can delete news"
ON public.cca_news FOR DELETE TO authenticated
USING (is_platform_admin(auth.uid()));

-- 2) Tabela de Faturas (Invoices)
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  numero text NOT NULL,
  data_emissao date NOT NULL,
  periodo_inicio date,
  periodo_fim date,
  valor numeric(12,2) NOT NULL,
  moeda text DEFAULT 'EUR',
  estado text NOT NULL DEFAULT 'em_aberto' CHECK (estado IN ('paga', 'em_aberto', 'vencida', 'em_disputa')),
  url_ficheiro text,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Leitura: membros da org podem ver, Platform Admin vê todas
CREATE POLICY "View invoices for org members or platform admin"
ON public.invoices FOR SELECT TO authenticated
USING (
  user_belongs_to_organization(auth.uid(), organization_id)
  OR is_platform_admin(auth.uid())
);

-- Escrita: apenas Platform Admin
CREATE POLICY "Platform admins can insert invoices"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update invoices"
ON public.invoices FOR UPDATE TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can delete invoices"
ON public.invoices FOR DELETE TO authenticated
USING (is_platform_admin(auth.uid()));

-- 3) Tabela de Pastas/Projetos do Cliente
CREATE TABLE public.client_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  descricao text,
  estado text NOT NULL DEFAULT 'ativa' CHECK (estado IN ('ativa', 'fechada')),
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_client_folders_updated_at
  BEFORE UPDATE ON public.client_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para client_folders
ALTER TABLE public.client_folders ENABLE ROW LEVEL SECURITY;

-- Leitura: membros da org podem ver, Platform Admin vê todas
CREATE POLICY "View folders for org members or platform admin"
ON public.client_folders FOR SELECT TO authenticated
USING (
  user_belongs_to_organization(auth.uid(), organization_id)
  OR is_platform_admin(auth.uid())
);

-- Escrita: apenas Platform Admin
CREATE POLICY "Platform admins can insert folders"
ON public.client_folders FOR INSERT TO authenticated
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update folders"
ON public.client_folders FOR UPDATE TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can delete folders"
ON public.client_folders FOR DELETE TO authenticated
USING (is_platform_admin(auth.uid()));

-- 4) Adicionar campos à tabela organizations para tipo de cliente e prazo de pagamento
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS tipo_cliente text DEFAULT 'pessoa_coletiva' 
  CHECK (tipo_cliente IN ('pessoa_individual', 'pessoa_coletiva')),
ADD COLUMN IF NOT EXISTS prazo_pagamento_dias integer DEFAULT 30;