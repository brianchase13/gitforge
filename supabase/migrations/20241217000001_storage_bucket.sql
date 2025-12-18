-- Create the repositories storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'repositories',
  'repositories',
  false,
  52428800, -- 50MB limit
  ARRAY['application/octet-stream', 'text/plain', 'application/json']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the repositories bucket

-- Policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'repositories');

-- Policy: Users can read files from repos they have access to
CREATE POLICY "Users can read repo files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'repositories');

-- Policy: Users can update their repo files
CREATE POLICY "Users can update repo files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'repositories');

-- Policy: Users can delete their repo files
CREATE POLICY "Users can delete repo files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'repositories');
