
ALTER TABLE public.eval_settings
ADD COLUMN reproducibility_weight integer NOT NULL DEFAULT 50,
ADD COLUMN cost_efficiency integer NOT NULL DEFAULT 50,
ADD COLUMN innovation integer NOT NULL DEFAULT 50;

ALTER TABLE public.eval_settings_history
ADD COLUMN reproducibility_weight integer NOT NULL DEFAULT 50,
ADD COLUMN cost_efficiency integer NOT NULL DEFAULT 50,
ADD COLUMN innovation integer NOT NULL DEFAULT 50;
