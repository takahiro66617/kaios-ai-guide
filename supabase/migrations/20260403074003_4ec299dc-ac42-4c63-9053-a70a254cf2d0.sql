
-- Create eval_settings table to persist evaluation weights
CREATE TABLE public.eval_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  speed integer NOT NULL DEFAULT 50,
  cross_functional integer NOT NULL DEFAULT 50,
  updated_by text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eval_settings ENABLE ROW LEVEL SECURITY;

-- Public access (no auth yet)
CREATE POLICY "Allow public read eval_settings" ON public.eval_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert eval_settings" ON public.eval_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update eval_settings" ON public.eval_settings FOR UPDATE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_eval_settings_updated_at
  BEFORE UPDATE ON public.eval_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row
INSERT INTO public.eval_settings (speed, cross_functional, updated_by) VALUES (50, 50, 'system');
