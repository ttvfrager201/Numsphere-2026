-- Create storage bucket for call flow audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-flow-audio', 'call-flow-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own audio files
CREATE POLICY "Users can upload their own call flow audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'call-flow-audio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own audio files
CREATE POLICY "Users can update their own call flow audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'call-flow-audio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own audio files
CREATE POLICY "Users can delete their own call flow audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'call-flow-audio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to audio files
CREATE POLICY "Public can view call flow audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'call-flow-audio');
