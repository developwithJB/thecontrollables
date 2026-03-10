
-- Create ig_proof_entries table
CREATE TABLE public.ig_proof_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ring_key TEXT NOT NULL,
  source_type TEXT NOT NULL,
  caption_text TEXT,
  image_url TEXT,
  ai_interpretation TEXT,
  tags TEXT[] DEFAULT '{}',
  attached_to_ring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ig_proof_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies: user can manage own rows
CREATE POLICY "Users can view own ig proof entries"
  ON public.ig_proof_entries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ig proof entries"
  ON public.ig_proof_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ig proof entries"
  ON public.ig_proof_entries FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ig proof entries"
  ON public.ig_proof_entries FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('ig-proof-images', 'ig-proof-images', true);

-- Storage policies
CREATE POLICY "Users can upload ig proof images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ig-proof-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public can view ig proof images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'ig-proof-images');

CREATE POLICY "Users can delete own ig proof images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'ig-proof-images' AND (storage.foldername(name))[1] = auth.uid()::text);
