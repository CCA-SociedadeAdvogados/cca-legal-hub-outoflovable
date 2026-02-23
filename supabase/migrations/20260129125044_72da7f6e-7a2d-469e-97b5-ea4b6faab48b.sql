-- Add industry_sectors column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN industry_sectors TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.organizations.industry_sectors IS 
'Areas de atuacao da organizacao para personalizacao de dashboards';