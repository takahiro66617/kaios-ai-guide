
-- 1) Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- 2) user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4) profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) people: link to auth user
ALTER TABLE public.people ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE;

-- 6) RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7) RLS for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view active profiles"
ON public.profiles FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 8) Replace open RLS on people with admin-only writes
DROP POLICY IF EXISTS "Allow public delete people" ON public.people;
DROP POLICY IF EXISTS "Allow public insert people" ON public.people;
DROP POLICY IF EXISTS "Allow public update people" ON public.people;
-- keep existing "Allow public read people"

CREATE POLICY "Admins can insert people"
ON public.people FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update people"
ON public.people FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete people"
ON public.people FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 9) kaizen_items: tighten policies
DROP POLICY IF EXISTS "Allow public delete" ON public.kaizen_items;
DROP POLICY IF EXISTS "Allow public insert" ON public.kaizen_items;
DROP POLICY IF EXISTS "Allow public update" ON public.kaizen_items;
-- keep "Allow public read"

CREATE POLICY "Authenticated can insert kaizen"
ON public.kaizen_items FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Author or admin can update kaizen"
ON public.kaizen_items FOR UPDATE TO authenticated
USING (author_id = auth.uid()::text OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Author or admin can delete kaizen"
ON public.kaizen_items FOR DELETE TO authenticated
USING (author_id = auth.uid()::text OR public.has_role(auth.uid(), 'admin'));

-- 10) eval_axes / eval_settings: admin-only writes
DROP POLICY IF EXISTS "Anyone can delete eval_axes" ON public.eval_axes;
DROP POLICY IF EXISTS "Anyone can insert eval_axes" ON public.eval_axes;
DROP POLICY IF EXISTS "Anyone can update eval_axes" ON public.eval_axes;

CREATE POLICY "Admins can insert eval_axes"
ON public.eval_axes FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update eval_axes"
ON public.eval_axes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete eval_axes"
ON public.eval_axes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow public insert eval_settings" ON public.eval_settings;
DROP POLICY IF EXISTS "Allow public update eval_settings" ON public.eval_settings;

CREATE POLICY "Admins can insert eval_settings"
ON public.eval_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update eval_settings"
ON public.eval_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 11) Auto-create profile on new auth user (uses raw_user_meta_data.username)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
