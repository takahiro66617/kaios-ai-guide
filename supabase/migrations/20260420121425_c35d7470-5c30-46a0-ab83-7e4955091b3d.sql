
-- Phase 4: 過去投稿の作者表示名スナップショット
ALTER TABLE public.kaizen_items
  ADD COLUMN IF NOT EXISTS author_name_snapshot text;

-- 既存データは現在の people.name で初期化
UPDATE public.kaizen_items k
SET author_name_snapshot = p.name
FROM public.people p
WHERE k.author_id = p.id::text
  AND k.author_name_snapshot IS NULL;

-- Phase 3: ゲスト系テーブルを認証ユーザー連動に強化
-- guest_profiles: guest_id = auth.uid()::text を本人のみ操作可
DROP POLICY IF EXISTS "Anyone can read guest_profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Anyone can insert guest_profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Anyone can update guest_profiles" ON public.guest_profiles;

CREATE POLICY "Users read own guest_profile"
  ON public.guest_profiles FOR SELECT TO authenticated
  USING (guest_id = auth.uid()::text);
CREATE POLICY "Users insert own guest_profile"
  ON public.guest_profiles FOR INSERT TO authenticated
  WITH CHECK (guest_id = auth.uid()::text);
CREATE POLICY "Users update own guest_profile"
  ON public.guest_profiles FOR UPDATE TO authenticated
  USING (guest_id = auth.uid()::text);

-- mission_progress: 本人のみ
DROP POLICY IF EXISTS "Anyone can read mission_progress" ON public.mission_progress;
DROP POLICY IF EXISTS "Anyone can insert mission_progress" ON public.mission_progress;
DROP POLICY IF EXISTS "Anyone can update mission_progress" ON public.mission_progress;

CREATE POLICY "Users read own mission_progress"
  ON public.mission_progress FOR SELECT TO authenticated
  USING (guest_id = auth.uid()::text);
CREATE POLICY "Users insert own mission_progress"
  ON public.mission_progress FOR INSERT TO authenticated
  WITH CHECK (guest_id = auth.uid()::text);
CREATE POLICY "Users update own mission_progress"
  ON public.mission_progress FOR UPDATE TO authenticated
  USING (guest_id = auth.uid()::text);

-- likes: 全員が件数を見られる必要があるが、insert/deleteは本人のみ
DROP POLICY IF EXISTS "Anyone can read likes" ON public.likes;
DROP POLICY IF EXISTS "Anyone can insert likes" ON public.likes;
DROP POLICY IF EXISTS "Anyone can delete likes" ON public.likes;

CREATE POLICY "Authenticated read likes"
  ON public.likes FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Users insert own like"
  ON public.likes FOR INSERT TO authenticated
  WITH CHECK (guest_id = auth.uid()::text);
CREATE POLICY "Users delete own like"
  ON public.likes FOR DELETE TO authenticated
  USING (guest_id = auth.uid()::text);
