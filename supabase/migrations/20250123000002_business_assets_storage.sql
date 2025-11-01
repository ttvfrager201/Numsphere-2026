INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Business owners can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-assets' AND
  EXISTS (
    SELECT 1 FROM public.business_accounts
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can update their assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-assets' AND
  EXISTS (
    SELECT 1 FROM public.business_accounts
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete their assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-assets' AND
  EXISTS (
    SELECT 1 FROM public.business_accounts
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view business assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-assets');