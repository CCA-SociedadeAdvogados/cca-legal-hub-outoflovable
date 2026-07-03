-- Segurança de storage: remover as políticas SELECT amplas que permitem a
-- QUALQUER cliente listar/enumerar todos os ficheiros dos buckets públicos
-- (advisor public_bucket_allows_listing).
--
-- O acesso por URL pública (getPublicUrl -> /object/public/{bucket}/{path})
-- NÃO depende destas políticas — funciona pelo flag public=true do bucket.
-- Estas políticas só habilitavam a enumeração via endpoint de listagem, que a
-- aplicação nunca usa. Removê-las bloqueia a enumeração sem afetar downloads,
-- uploads (políticas INSERT mantidas) nem a exibição de logos/legislação.

DROP POLICY IF EXISTS "Anyone can read org assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read legal mirror files" ON storage.objects;
