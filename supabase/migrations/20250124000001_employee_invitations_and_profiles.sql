CREATE TABLE IF NOT EXISTS public.employee_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES public.business_accounts(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  invitation_token text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  accepted_at timestamp with time zone,
  UNIQUE(business_id, email)
);

CREATE INDEX IF NOT EXISTS employee_invitations_business_id_idx ON public.employee_invitations(business_id);
CREATE INDEX IF NOT EXISTS employee_invitations_token_idx ON public.employee_invitations(invitation_token);

ALTER TABLE public.business_employees ADD COLUMN IF NOT EXISTS profile_picture_url text;

DROP POLICY IF EXISTS "Business owners can manage invitations" ON public.employee_invitations;
CREATE POLICY "Business owners can manage invitations"
ON public.employee_invitations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.business_accounts
    WHERE id = business_id AND owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Anyone can view their invitation" ON public.employee_invitations;
CREATE POLICY "Anyone can view their invitation"
ON public.employee_invitations FOR SELECT
USING (true);

alter publication supabase_realtime add table employee_invitations;
