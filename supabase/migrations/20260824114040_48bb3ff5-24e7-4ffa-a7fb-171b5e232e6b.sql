-- IG proof screenshots contain personal behavioral evidence. Keep the bucket
-- private and allow reads only from the authenticated owner's top-level folder.
DROP POLICY IF EXISTS "Public can view ig proof images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own ig proof images" ON storage.objects;
CREATE POLICY "Users can view own ig proof images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ig-proof-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );