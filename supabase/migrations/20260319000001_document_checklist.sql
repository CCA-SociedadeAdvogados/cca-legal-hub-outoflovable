-- Document Checklist: track required document types and their validity dates per organization
-- This migration creates the structure for CCA-managed document requirements

CREATE TABLE IF NOT EXISTS document_checklist_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default document types
INSERT INTO document_checklist_types (name, name_en, description, is_required, sort_order) VALUES
  ('Certidão Permanente', 'Permanent Certificate', 'Certidão comercial permanente da organização', true, 1),
  ('RCBE', 'RCBE', 'Registo Central do Beneficiário Efetivo', true, 2),
  ('Documentos de Identificação', 'Identification Documents', 'Identificação dos sócios/administradores', true, 3),
  ('Comprovativo de Morada', 'Proof of Address', 'Comprovativo de morada da sede', true, 4),
  ('Certidão de Não Dívida AT', 'Tax Compliance Certificate', 'Certidão de não dívida à Autoridade Tributária', false, 5),
  ('Certidão de Não Dívida SS', 'Social Security Compliance', 'Certidão de não dívida à Segurança Social', false, 6)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS organization_document_checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  checklist_type_id UUID NOT NULL REFERENCES document_checklist_types(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'missing' CHECK (status IN ('missing', 'uploaded', 'expired', 'expiring_soon')),
  validity_date DATE,
  confirmed_by_user BOOLEAN DEFAULT false,
  ai_suggested_date DATE,
  file_reference TEXT,
  notes TEXT,
  updated_by_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, checklist_type_id)
);

-- RLS
ALTER TABLE document_checklist_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_document_checklist ENABLE ROW LEVEL SECURITY;

-- Document types are readable by all authenticated users
CREATE POLICY "document_checklist_types_read" ON document_checklist_types
  FOR SELECT TO authenticated USING (true);

-- Organization checklist entries are scoped by org membership
CREATE POLICY "organization_document_checklist_read" ON organization_document_checklist
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM cca_internal_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "organization_document_checklist_write" ON organization_document_checklist
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
    OR EXISTS (
      SELECT 1 FROM cca_internal_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_org_doc_checklist_org ON organization_document_checklist(organization_id);
