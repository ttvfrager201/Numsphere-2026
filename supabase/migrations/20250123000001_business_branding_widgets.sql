ALTER TABLE public.business_accounts ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.business_accounts ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#4F46E5';
ALTER TABLE public.business_accounts ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#7C3AED';
ALTER TABLE public.business_accounts ADD COLUMN IF NOT EXISTS custom_domain text;

CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES public.business_accounts(id) ON DELETE CASCADE NOT NULL,
  widget_key text NOT NULL,
  widget_name text NOT NULL,
  enabled_for_employees boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(business_id, widget_key)
);

CREATE INDEX IF NOT EXISTS dashboard_widgets_business_id_idx ON public.dashboard_widgets(business_id);

DO $$
BEGIN
  DROP POLICY IF EXISTS "Business owners can manage widgets" ON public.dashboard_widgets;
  CREATE POLICY "Business owners can manage widgets"
  ON public.dashboard_widgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_accounts
      WHERE id = business_id AND owner_id = auth.uid()
    )
  );

  DROP POLICY IF EXISTS "Employees can view widgets" ON public.dashboard_widgets;
  CREATE POLICY "Employees can view widgets"
  ON public.dashboard_widgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_employees
      WHERE business_id = dashboard_widgets.business_id AND user_id = auth.uid()
    )
  );
END
$$;

INSERT INTO public.dashboard_widgets (business_id, widget_key, widget_name, enabled_for_employees, display_order)
SELECT 
  ba.id,
  widget.wkey,
  widget.wname,
  true,
  widget.worder
FROM public.business_accounts ba
CROSS JOIN (
  VALUES 
    ('overview_stats', 'Overview Stats', 1),
    ('recent_calls', 'Recent Calls', 2),
    ('call_flows', 'Call Flows', 3),
    ('phone_numbers', 'Phone Numbers', 4),
    ('quick_actions', 'Quick Actions', 5)
) AS widget(wkey, wname, worder)
ON CONFLICT (business_id, widget_key) DO NOTHING;

alter publication supabase_realtime add table dashboard_widgets;