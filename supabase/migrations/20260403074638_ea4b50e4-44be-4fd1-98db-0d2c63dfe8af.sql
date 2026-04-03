
CREATE TABLE public.eval_settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  speed integer NOT NULL,
  cross_functional integer NOT NULL,
  updated_by text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.eval_settings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read eval_settings_history" ON public.eval_settings_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert eval_settings_history" ON public.eval_settings_history FOR INSERT WITH CHECK (true);
