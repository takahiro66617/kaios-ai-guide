ALTER TABLE public.kaizen_items
  ADD COLUMN IF NOT EXISTS usage_cost numeric,
  ADD COLUMN IF NOT EXISTS estimated_annual_impact numeric;