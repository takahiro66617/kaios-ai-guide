
-- Create people table for proposer management
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  years_at_company INTEGER NOT NULL DEFAULT 1,
  avatar_initial TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth yet)
CREATE POLICY "Allow public read people" ON public.people FOR SELECT USING (true);
CREATE POLICY "Allow public insert people" ON public.people FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update people" ON public.people FOR UPDATE USING (true);
CREATE POLICY "Allow public delete people" ON public.people FOR DELETE USING (true);

-- Seed initial people data
INSERT INTO public.people (name, department, role, years_at_company, avatar_initial) VALUES
  ('佐藤 美咲', 'カスタマーサポート部', 'チームリーダー', 3, '佐'),
  ('田中 花子', '情報システム部', 'エンジニア', 5, '田'),
  ('鈴木 次郎', '営業部', 'マネージャー', 7, '鈴'),
  ('高橋 美咲', '経営企画部', '主任', 4, '高'),
  ('山本 健一', '製造部', '現場リーダー', 10, '山'),
  ('中村 さくら', '経理部', '担当', 2, '中'),
  ('小林 大輔', '物流部', '係長', 6, '小'),
  ('加藤 裕子', '総務部', '担当', 3, '加');

-- Add trigger for updated_at
CREATE TRIGGER update_people_updated_at
BEFORE UPDATE ON public.people
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
