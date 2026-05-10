
-- 2) manager_departments table
CREATE TABLE IF NOT EXISTS public.manager_departments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  department text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, department)
);
ALTER TABLE public.manager_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage manager_departments"
  ON public.manager_departments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own managed departments"
  ON public.manager_departments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3) Helper function: is the user a manager of given department?
CREATE OR REPLACE FUNCTION public.is_manager_of_department(_user_id uuid, _department text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.manager_departments
    WHERE user_id = _user_id AND department = _department
  )
$$;

-- 4) RLS updates

-- eval_axes: managers can read
DROP POLICY IF EXISTS "Admins can read eval_axes" ON public.eval_axes;
CREATE POLICY "Admins or managers can read eval_axes"
  ON public.eval_axes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- execution_stage_history: managers can read & insert
DROP POLICY IF EXISTS "Admins can read stage history" ON public.execution_stage_history;
DROP POLICY IF EXISTS "Admins can insert stage history" ON public.execution_stage_history;
CREATE POLICY "Admins or managers read stage history"
  ON public.execution_stage_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins or managers insert stage history"
  ON public.execution_stage_history FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- kaizen_items: update can be done by admin / owner / manager-of-dept
DROP POLICY IF EXISTS "Owner or admin can update kaizen" ON public.kaizen_items;
CREATE POLICY "Owner admin or manager can update kaizen"
  ON public.kaizen_items FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (author_id = public.current_person_id(auth.uid()))
    OR (public.has_role(auth.uid(), 'manager') AND public.is_manager_of_department(auth.uid(), department))
  );
