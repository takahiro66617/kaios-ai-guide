
CREATE TABLE public.kaizen_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  cause TEXT NOT NULL,
  solution TEXT NOT NULL,
  effect TEXT NOT NULL,
  department TEXT NOT NULL,
  category TEXT NOT NULL,
  reproducibility TEXT NOT NULL DEFAULT '中',
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT '構造化済み',
  author_id TEXT NOT NULL,
  adopted_by TEXT[] NOT NULL DEFAULT '{}',
  impact_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kaizen_items ENABLE ROW LEVEL SECURITY;

-- Public access for demo (no auth required)
CREATE POLICY "Allow public read" ON public.kaizen_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.kaizen_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.kaizen_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.kaizen_items FOR DELETE USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_kaizen_items_updated_at
  BEFORE UPDATE ON public.kaizen_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
