
ALTER TABLE public.games ADD COLUMN image_url text DEFAULT NULL;

INSERT INTO storage.buckets (id, name, public) VALUES ('game-images', 'game-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view game images" ON storage.objects FOR SELECT USING (bucket_id = 'game-images');
CREATE POLICY "Authenticated users can upload game images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'game-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete their own game images" ON storage.objects FOR DELETE USING (bucket_id = 'game-images' AND auth.uid()::text = (storage.foldername(name))[1]);
