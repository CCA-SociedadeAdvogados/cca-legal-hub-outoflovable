-- Add feature flag to disable AI translation for documents
INSERT INTO feature_flags (name, description, enabled)
VALUES (
  'DISABLE_AI_TRANSLATION_FOR_DOCUMENTS',
  'Desativa tradução automática por IA para documentos longos (políticas, normativos)',
  true
)
ON CONFLICT (name) DO NOTHING;