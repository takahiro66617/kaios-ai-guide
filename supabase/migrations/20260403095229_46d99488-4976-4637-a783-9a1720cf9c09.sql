
-- Create debug_reports table
CREATE TABLE public.debug_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  page_url text NOT NULL,
  user_agent text,
  comment text,
  status text DEFAULT 'open',
  screenshot_url text,
  error_logs jsonb DEFAULT '[]'::jsonb,
  console_logs jsonb DEFAULT '[]'::jsonb,
  network_logs jsonb DEFAULT '[]'::jsonb,
  interaction_logs jsonb DEFAULT '[]'::jsonb,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.debug_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can insert debug reports
CREATE POLICY "Anyone can insert debug reports"
ON public.debug_reports
FOR INSERT
WITH CHECK (true);

-- Authenticated users can read debug reports
CREATE POLICY "Authenticated users can read debug reports"
ON public.debug_reports
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can update debug reports
CREATE POLICY "Authenticated users can update debug reports"
ON public.debug_reports
FOR UPDATE
TO authenticated
USING (true);

-- Authenticated users can delete debug reports
CREATE POLICY "Authenticated users can delete debug reports"
ON public.debug_reports
FOR DELETE
TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_debug_reports_updated_at
BEFORE UPDATE ON public.debug_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for debug screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('debug-screenshots', 'debug-screenshots', true);

-- Storage policies
CREATE POLICY "Anyone can upload debug screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'debug-screenshots');

CREATE POLICY "Anyone can view debug screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'debug-screenshots');
