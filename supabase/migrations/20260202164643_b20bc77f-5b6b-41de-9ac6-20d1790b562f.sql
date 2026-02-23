-- Adicionar coluna sharepoint_url às pastas para integração com SharePoint
ALTER TABLE public.client_folders 
ADD COLUMN sharepoint_url TEXT DEFAULT NULL;