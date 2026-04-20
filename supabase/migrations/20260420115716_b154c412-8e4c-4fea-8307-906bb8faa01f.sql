CREATE OR REPLACE FUNCTION public.current_person_id(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id::text
  FROM public.people
  WHERE user_id = _user_id
  LIMIT 1
$$;

DROP POLICY IF EXISTS "Authenticated users can read debug reports" ON public.debug_reports;
DROP POLICY IF EXISTS "Authenticated users can update debug reports" ON public.debug_reports;
DROP POLICY IF EXISTS "Authenticated users can delete debug reports" ON public.debug_reports;
CREATE POLICY "Admins can read debug reports"
ON public.debug_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update debug reports"
ON public.debug_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete debug reports"
ON public.debug_reports
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read eval_axes" ON public.eval_axes;
CREATE POLICY "Admins can read eval_axes"
ON public.eval_axes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow public read eval_settings" ON public.eval_settings;
CREATE POLICY "Admins can read eval_settings"
ON public.eval_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow public read eval_settings_history" ON public.eval_settings_history;
DROP POLICY IF EXISTS "Allow public insert eval_settings_history" ON public.eval_settings_history;
CREATE POLICY "Admins can read eval_settings_history"
ON public.eval_settings_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert eval_settings_history"
ON public.eval_settings_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read stage history" ON public.execution_stage_history;
DROP POLICY IF EXISTS "Anyone can insert stage history" ON public.execution_stage_history;
CREATE POLICY "Admins can read stage history"
ON public.execution_stage_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert stage history"
ON public.execution_stage_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow public read people" ON public.people;
CREATE POLICY "Authenticated users can read active people"
ON public.people
FOR SELECT
TO authenticated
USING (is_active = true);
CREATE POLICY "Admins can read all people"
ON public.people
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can view active profiles" ON public.profiles;

DROP POLICY IF EXISTS "Allow public read" ON public.kaizen_items;
DROP POLICY IF EXISTS "Authenticated can insert kaizen" ON public.kaizen_items;
DROP POLICY IF EXISTS "Author or admin can update kaizen" ON public.kaizen_items;
DROP POLICY IF EXISTS "Author or admin can delete kaizen" ON public.kaizen_items;
CREATE POLICY "Authenticated users can read kaizen items"
ON public.kaizen_items
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "Owner or admin can insert kaizen"
ON public.kaizen_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR author_id = public.current_person_id(auth.uid())
);
CREATE POLICY "Owner or admin can update kaizen"
ON public.kaizen_items
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR author_id = public.current_person_id(auth.uid())
);
CREATE POLICY "Owner or admin can delete kaizen"
ON public.kaizen_items
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR author_id = public.current_person_id(auth.uid())
);