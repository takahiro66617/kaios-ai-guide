
ALTER TABLE public.kaizen_items
ADD COLUMN occurrence_place text NOT NULL DEFAULT '',
ADD COLUMN frequency text NOT NULL DEFAULT '',
ADD COLUMN numerical_evidence text NOT NULL DEFAULT '';
