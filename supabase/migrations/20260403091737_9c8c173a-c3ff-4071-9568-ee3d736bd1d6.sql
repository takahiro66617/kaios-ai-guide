
-- Create eval_axes table for dynamic evaluation axes
CREATE TABLE public.eval_axes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  tooltip TEXT NOT NULL DEFAULT '',
  left_label TEXT NOT NULL DEFAULT '低 (0%)',
  right_label TEXT NOT NULL DEFAULT '高 (100%)',
  default_value INTEGER NOT NULL DEFAULT 50,
  weight INTEGER NOT NULL DEFAULT 50,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eval_axes ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (no auth in this app)
CREATE POLICY "Anyone can read eval_axes" ON public.eval_axes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert eval_axes" ON public.eval_axes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update eval_axes" ON public.eval_axes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete eval_axes" ON public.eval_axes FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_eval_axes_updated_at
  BEFORE UPDATE ON public.eval_axes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default 5 axes
INSERT INTO public.eval_axes (name, key, description, tooltip, left_label, right_label, default_value, weight, sort_order) VALUES
  ('迅速な実行', 'speed', '計画から実行までのリードタイムの短さをどれだけ評価するか', '計画から実行までのリードタイムの短さを評価する度合い', '慎重・確実重視 (0%)', '超高速重視 (100%)', 50, 50, 1),
  ('部門横断での有効性', 'cross_functional', '他部署への波及効果や再利用性をどれだけ評価するか', '他部署への波及効果や再利用性を評価する度合い', '個別最適 (0%)', '全社最適 (100%)', 50, 50, 2),
  ('再現性の重視', 'reproducibility', '標準化・マニュアル化により他でも再現できる改善をどれだけ評価するか', '改善の標準化・横展開のしやすさを評価する度合い', '一回限りでもOK (0%)', '高い再現性重視 (100%)', 50, 50, 3),
  ('コスト効率', 'cost_efficiency', '投資対効果（ROI）の高さをどれだけ評価するか', '低コストで高い効果を発揮する改善を評価する度合い', '効果重視 (0%)', '高ROI重視 (100%)', 50, 50, 4),
  ('革新性', 'innovation', '既存の改良だけでなく、新しいアプローチによる改善をどれだけ評価するか', '従来にない発想やアプローチを評価する度合い', '改良型重視 (0%)', '革新型重視 (100%)', 50, 50, 5);
