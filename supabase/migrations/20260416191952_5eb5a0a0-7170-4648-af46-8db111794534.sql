-- Tighten storage RLS for game-images and avatars buckets
-- Files must be stored under a folder named with the user's UUID, e.g. {user_id}/file.jpg

-- ============ game-images ============
-- Drop any existing policies that may be too permissive
DROP POLICY IF EXISTS "Authenticated users can upload game images" ON storage.objects;
DROP POLICY IF EXISTS "Game images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload game images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own game images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own game images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view game images" ON storage.objects;

-- Public can view (bucket is public)
CREATE POLICY "Public can view game images"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-images');

CREATE POLICY "Users can upload own game images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'game-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own game images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'game-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'game-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own game images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'game-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============ avatars ============
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;

CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);