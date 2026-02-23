-- Add column for storing file URL
ALTER TABLE public.politicas 
ADD COLUMN arquivo_url TEXT,
ADD COLUMN arquivo_nome TEXT,
ADD COLUMN arquivo_mime_type TEXT;

-- Create storage bucket for policies documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('politicas', 'politicas', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket
CREATE POLICY "Users can upload policy files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'politicas' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view policy files from their org" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'politicas' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete policy files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'politicas' 
  AND auth.uid() IS NOT NULL
);