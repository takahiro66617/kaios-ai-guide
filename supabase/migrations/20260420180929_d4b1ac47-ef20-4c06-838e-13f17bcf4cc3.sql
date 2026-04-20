-- 1. Backfill existing statuses to '承認済み'
UPDATE public.kaizen_items SET status = '承認済み' WHERE status IS NULL OR status NOT IN ('下書き','申請中','承認済み','差戻し');

-- 2. Change default
ALTER TABLE public.kaizen_items ALTER COLUMN status SET DEFAULT '下書き';

-- 3. Add author_note column
ALTER TABLE public.kaizen_items ADD COLUMN IF NOT EXISTS author_note text;

-- 4. Validation trigger for status values + transition rules
CREATE OR REPLACE FUNCTION public.validate_kaizen_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_owner boolean;
BEGIN
  -- Validate value
  IF NEW.status NOT IN ('下書き','申請中','承認済み','差戻し') THEN
    RAISE EXCEPTION 'status は 下書き／申請中／承認済み／差戻し のいずれかである必要があります';
  END IF;

  -- Skip on insert (insert RLS already enforces ownership)
  IF TG_OP = 'INSERT' THEN
    -- New rows can only start in 下書き or 申請中 unless admin
    is_admin := public.has_role(auth.uid(), 'admin');
    IF NOT is_admin AND NEW.status NOT IN ('下書き','申請中') THEN
      RAISE EXCEPTION '新規作成時のステータスは 下書き または 申請中 のみです';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: check transition
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    is_admin := public.has_role(auth.uid(), 'admin');
    is_owner := (OLD.author_id = public.current_person_id(auth.uid()));

    IF is_admin THEN
      RETURN NEW; -- admin can do anything
    END IF;

    IF NOT is_owner THEN
      RAISE EXCEPTION 'このレコードのステータスを変更する権限がありません';
    END IF;

    -- Owner allowed transitions:
    -- 下書き -> 下書き / 申請中
    -- 申請中 -> 下書き
    -- 差戻し -> 下書き / 申請中
    -- 承認済み -> (owner cannot change)
    IF OLD.status = '承認済み' THEN
      RAISE EXCEPTION '承認済み案件のステータス変更は管理者のみ可能です';
    END IF;

    IF NEW.status = '承認済み' THEN
      RAISE EXCEPTION '承認は管理者のみ可能です';
    END IF;

    IF NEW.status NOT IN ('下書き','申請中') THEN
      RAISE EXCEPTION 'ご自身では 下書き または 申請中 へのみ変更可能です';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_kaizen_status ON public.kaizen_items;
CREATE TRIGGER trg_validate_kaizen_status
BEFORE INSERT OR UPDATE ON public.kaizen_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_kaizen_status();