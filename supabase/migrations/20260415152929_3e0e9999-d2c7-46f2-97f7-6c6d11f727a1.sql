
-- Guest profiles for gamification
CREATE TABLE public.guest_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT 'ゲスト',
  level integer NOT NULL DEFAULT 1,
  xp integer NOT NULL DEFAULT 0,
  total_submissions integer NOT NULL DEFAULT 0,
  consecutive_days integer NOT NULL DEFAULT 0,
  last_active_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read guest_profiles" ON public.guest_profiles FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert guest_profiles" ON public.guest_profiles FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update guest_profiles" ON public.guest_profiles FOR UPDATE TO public USING (true);

-- Missions definition
CREATE TABLE public.missions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '🎯',
  xp_reward integer NOT NULL DEFAULT 10,
  target_count integer NOT NULL DEFAULT 1,
  category text NOT NULL DEFAULT 'action',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read missions" ON public.missions FOR SELECT TO public USING (true);

-- Mission progress per guest
CREATE TABLE public.mission_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id text NOT NULL,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  current_count integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(guest_id, mission_id)
);

ALTER TABLE public.mission_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read mission_progress" ON public.mission_progress FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert mission_progress" ON public.mission_progress FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update mission_progress" ON public.mission_progress FOR UPDATE TO public USING (true);

-- Likes on kaizen items
CREATE TABLE public.likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id text NOT NULL,
  kaizen_item_id uuid NOT NULL REFERENCES public.kaizen_items(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(guest_id, kaizen_item_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read likes" ON public.likes FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert likes" ON public.likes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can delete likes" ON public.likes FOR DELETE TO public USING (true);

-- Seed missions
INSERT INTO public.missions (key, title, description, icon, xp_reward, target_count, category, sort_order) VALUES
('first_submission', '初めての改善提出', '最初の改善提案を提出しよう', '🚀', 50, 1, 'milestone', 1),
('submit_3', '改善マスター見習い', '改善提案を3件提出しよう', '📝', 100, 3, 'milestone', 2),
('submit_5', '改善のプロ', '改善提案を5件提出しよう', '⭐', 150, 5, 'milestone', 3),
('submit_10', '改善エキスパート', '改善提案を10件提出しよう', '🏆', 300, 10, 'milestone', 4),
('high_impact', 'ハイインパクト', 'インパクトスコア80以上の改善を提出', '💎', 200, 1, 'quality', 5),
('multi_department', '横展開の達人', '他部署に採用された改善を提出', '🌐', 150, 1, 'quality', 6),
('consecutive_3', '3日連続アクセス', '3日連続でアプリにアクセスしよう', '🔥', 100, 3, 'engagement', 7);
