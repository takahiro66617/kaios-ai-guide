UPDATE public.kaizen_items
SET execution_stage = '提案中', admin_memo = NULL, stage_changed_at = NULL, stage_changed_by = NULL
WHERE id = '6b4ab8f0-4754-49c3-925c-6b9cfad9c1e1';

DELETE FROM public.execution_stage_history WHERE changed_by = 'admin-verification';