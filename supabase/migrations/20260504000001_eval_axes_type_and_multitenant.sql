-- ============================================================
-- 評価軸：固定軸/選択軸の分離 + マルチテナント対応の準備
-- ============================================================

-- 1. axis_type カラムを追加
--    fixed    = 全社共通の固定3軸（変更不可）
--    strategic= 会社が選ぶ戦略軸
--    cultural = 会社が選ぶ文化軸
--    legacy   = 移行前の旧軸
ALTER TABLE public.eval_axes
  ADD COLUMN IF NOT EXISTS axis_type text NOT NULL DEFAULT 'legacy'
    CHECK (axis_type IN ('fixed', 'strategic', 'cultural', 'legacy')),
  ADD COLUMN IF NOT EXISTS weight_locked boolean NOT NULL DEFAULT false;

-- 2. 固定3軸を upsert（存在しなければ追加、あれば正しい値に更新）
INSERT INTO public.eval_axes
  (name, key, description, tooltip, axis_type, weight, weight_locked, default_value, sort_order, is_active,
   left_label, right_label)
VALUES
  ('本質性',     'essence',     '表面的な現象対応ではなく、重要な問題や原因に触れているか。',         '・問題設定の明確さ\n・原因仮説の深さ\n・構造的課題への接触',  'fixed', 20, true, 20, 1, true, '低 (0%)', '高 (100%)'),
  ('収益寄与性', 'profitability','売上増加・コスト削減など、事業価値につながるか。',                   '・期待効果の明確さ\n・影響範囲の大きさ\n・経営価値との関連性', 'fixed', 20, true, 20, 2, true, '低 (0%)', '高 (100%)'),
  ('実現性',     'feasibility', '現実の業務の中で実行可能であるか。',                                 '・内容の具体性\n・実施主体の明確さ\n・業務運用への落とし込み','fixed', 20, true, 20, 3, true, '低 (0%)', '高 (100%)')
ON CONFLICT (key) DO UPDATE SET
  axis_type     = 'fixed',
  weight        = 20,
  weight_locked = true,
  is_active     = true;

-- 3. 旧軸（speed / cross_functional / reproducibility / cost_efficiency / innovation）を legacy に設定
UPDATE public.eval_axes
SET axis_type = 'legacy', is_active = false
WHERE key IN ('speed', 'cross_functional', 'reproducibility', 'cost_efficiency', 'innovation')
  AND axis_type = 'legacy';

-- ============================================================
-- ⚠️ マルチテナント対応（TODO: 別スプリントで実施）
-- ============================================================
-- 現状の問題：
--   eval_axes テーブルに company_id が存在しないため、
--   すべての会社が同じ評価軸を共有している。
--   A社が戦略軸を「生産性向上」に変えると、B社にも影響する。
--
-- 必要な対応：
--   1. companies テーブルの作成
--      CREATE TABLE public.companies (
--        id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--        name TEXT NOT NULL,
--        ...
--      );
--
--   2. eval_axes に company_id を追加
--      ALTER TABLE public.eval_axes
--        ADD COLUMN company_id UUID REFERENCES public.companies(id);
--
--      固定軸は company_id = NULL（全社共通）
--      選択軸は company_id = 各社のID
--
--   3. RLS ポリシーの更新
--      -- 固定軸は全員が読める
--      CREATE POLICY "Read fixed axes" ON public.eval_axes
--        FOR SELECT USING (axis_type = 'fixed' OR company_id = current_company_id());
--
--      -- 選択軸は自社のみ書ける
--      CREATE POLICY "Admin write own company axes" ON public.eval_axes
--        FOR ALL USING (
--          has_role(auth.uid(), 'admin') AND
--          company_id = current_company_id()
--        );
--
--   4. people / kaizen_items / profiles にも company_id を追加
--      （すべてのテーブルに対してマルチテナント対応が必要）
-- ============================================================
