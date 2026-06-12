-- 005_storage_uploads_bucket.sql
-- Create 'uploads' storage bucket and configure RLS policies for file uploads

-- Insert 'uploads' bucket into storage.buckets if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  false,
  26214400, -- 25 MB in bytes
  '{"audio/mpeg", "audio/mp3", "audio/x-m4a", "audio/m4a", "video/mp4", "audio/webm", "video/webm", "audio/wav", "audio/ogg"}'
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage.objects on 'uploads' bucket

CREATE POLICY "Allow authenticated inserts to uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Allow authenticated selects from uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'uploads' AND (auth.uid()::text = (regexp_split_to_array(name, '/'))[1]));

CREATE POLICY "Allow authenticated deletes from uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'uploads' AND (auth.uid()::text = (regexp_split_to_array(name, '/'))[1]));
