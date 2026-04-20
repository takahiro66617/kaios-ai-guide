-- 1. kaizen_itemsに実行段階関連カラムを追加
ALTER TABLE public.kaizen_items
  ADD COLUMN IF NOT EXISTS execution_stage TEXT NOT NULL DEFAULT '提案中',
  ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS stage_changed_by TEXT,
  ADD COLUMN IF NOT EXISTS admin_memo TEXT;

-- 2. CHECK制約の代わりにバリデーショントリガー（拡張性のため）
CREATE OR REPLACE FUNCTION public.validate_execution_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.execution_stage NOT IN ('提案中', '実行予定', '実行済み') THEN
    RAISE EXCEPTION '実行段階は「提案中」「実行予定」「実行済み」のいずれかである必要があります';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_kaizen_execution_stage ON public.kaizen_items;
CREATE TRIGGER validate_kaizen_execution_stage
  BEFORE INSERT OR UPDATE ON public.kaizen_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_execution_stage();

-- 3. 実行段階履歴テーブル
CREATE TABLE IF NOT EXISTS public.execution_stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kaizen_item_id UUID NOT NULL REFERENCES public.kaizen_items(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by TEXT NOT NULL DEFAULT 'admin',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_history_item ON public.execution_stage_history(kaizen_item_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_created ON public.execution_stage_history(created_at DESC);

ALTER TABLE public.execution_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stage history"
  ON public.execution_stage_history FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert stage history"
  ON public.execution_stage_history FOR INSERT
  WITH CHECK (true);

-- 4. 既存データを「提案中」に統一（既にDEFAULTで設定済みだが念のため）
UPDATE public.kaizen_items
SET execution_stage = '提案中'
WHERE execution_stage IS NULL OR execution_stage = '';
