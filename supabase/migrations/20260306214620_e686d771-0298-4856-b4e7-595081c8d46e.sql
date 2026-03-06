
-- Add media and edit/delete columns to chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_name text,
  ADD COLUMN IF NOT EXISTS media_size bigint,
  ADD COLUMN IF NOT EXISTS media_mime_type text,
  ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create chat-media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf','video/mp4','audio/mpeg','audio/ogg','audio/webm','audio/mp4']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can read public bucket
CREATE POLICY "chat_media_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media');

-- Storage RLS: authenticated users can upload
CREATE POLICY "chat_media_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

-- Storage RLS: users can delete own uploads
CREATE POLICY "chat_media_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = 'chat');
