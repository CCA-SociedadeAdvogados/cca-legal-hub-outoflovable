-- Create storage bucket for legal documents
insert into storage.buckets (id, name, public)
values ('legal-mirror', 'legal-mirror', true)
on conflict (id) do nothing;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read legal mirror files'
  ) THEN
    CREATE POLICY "Public read legal mirror files"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'legal-mirror');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Service role can upload legal mirror files'
  ) THEN
    CREATE POLICY "Service role can upload legal mirror files"
      ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = 'legal-mirror');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Service role can update legal mirror files'
  ) THEN
    CREATE POLICY "Service role can update legal mirror files"
      ON storage.objects
      FOR UPDATE
      USING (bucket_id = 'legal-mirror');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Service role can delete legal mirror files'
  ) THEN
    CREATE POLICY "Service role can delete legal mirror files"
      ON storage.objects
      FOR DELETE
      USING (bucket_id = 'legal-mirror');
  END IF;
END
$$;
