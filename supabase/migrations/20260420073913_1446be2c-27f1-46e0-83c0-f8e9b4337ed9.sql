-- Phase 1 動作検証: ステージ変更とメモ保存をシミュレート
UPDATE public.kaizen_items
SET execution_stage = '実行予定',
    admin_memo = '[検証] Phase1動作確認テスト',
    stage_changed_at = now(),
    stage_changed_by = 'admin-verification'
WHERE id = '6b4ab8f0-4754-49c3-925c-6b9cfad9c1e1';

INSERT INTO public.execution_stage_history (kaizen_item_id, from_stage, to_stage, changed_by, reason)
VALUES ('6b4ab8f0-4754-49c3-925c-6b9cfad9c1e1', '提案中', '実行予定', 'admin-verification', 'Phase1検証');

-- 不正値が拒否されることも確認したいが、トリガーで弾かれるためここではスキップ
