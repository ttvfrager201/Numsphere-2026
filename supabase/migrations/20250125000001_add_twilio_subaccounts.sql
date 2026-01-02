-- Add Twilio subaccount SID to business_accounts and users tables
ALTER TABLE public.business_accounts 
ADD COLUMN IF NOT EXISTS twilio_subaccount_sid TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS twilio_subaccount_sid TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS business_accounts_twilio_subaccount_sid_idx 
ON public.business_accounts(twilio_subaccount_sid);

CREATE INDEX IF NOT EXISTS users_twilio_subaccount_sid_idx 
ON public.users(twilio_subaccount_sid);
