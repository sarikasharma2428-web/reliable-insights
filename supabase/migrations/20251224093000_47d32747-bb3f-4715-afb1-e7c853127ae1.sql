-- Create app_role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any write role
CREATE OR REPLACE FUNCTION public.has_write_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'user')
  )
$$;

-- Drop all existing overly permissive policies and replace with role-based ones

-- SERVICES TABLE
DROP POLICY IF EXISTS "Authenticated users can view services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can insert services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can update services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can delete services" ON public.services;

CREATE POLICY "All authenticated users can view services"
ON public.services FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users with write role can insert services"
ON public.services FOR INSERT TO authenticated
WITH CHECK (public.has_write_role(auth.uid()));

CREATE POLICY "Users with write role can update services"
ON public.services FOR UPDATE TO authenticated
USING (public.has_write_role(auth.uid()));

CREATE POLICY "Only admins can delete services"
ON public.services FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- METRICS TABLE
DROP POLICY IF EXISTS "Authenticated users can view metrics" ON public.metrics;
DROP POLICY IF EXISTS "Authenticated users can insert metrics" ON public.metrics;

CREATE POLICY "All authenticated users can view metrics"
ON public.metrics FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users with write role can insert metrics"
ON public.metrics FOR INSERT TO authenticated
WITH CHECK (public.has_write_role(auth.uid()));

-- LOGS TABLE
DROP POLICY IF EXISTS "Authenticated users can view logs" ON public.logs;
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.logs;

CREATE POLICY "All authenticated users can view logs"
ON public.logs FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users with write role can insert logs"
ON public.logs FOR INSERT TO authenticated
WITH CHECK (public.has_write_role(auth.uid()));

-- ALERTS TABLE
DROP POLICY IF EXISTS "Authenticated users can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON public.alerts;

CREATE POLICY "All authenticated users can view alerts"
ON public.alerts FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users with write role can insert alerts"
ON public.alerts FOR INSERT TO authenticated
WITH CHECK (public.has_write_role(auth.uid()));

CREATE POLICY "Users with write role can update alerts"
ON public.alerts FOR UPDATE TO authenticated
USING (public.has_write_role(auth.uid()));

-- INCIDENTS TABLE
DROP POLICY IF EXISTS "Authenticated users can view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated users can insert incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated users can update incidents" ON public.incidents;

CREATE POLICY "All authenticated users can view incidents"
ON public.incidents FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users with write role can insert incidents"
ON public.incidents FOR INSERT TO authenticated
WITH CHECK (public.has_write_role(auth.uid()));

CREATE POLICY "Users with write role can update incidents"
ON public.incidents FOR UPDATE TO authenticated
USING (public.has_write_role(auth.uid()));

-- INCIDENT_EVENTS TABLE
DROP POLICY IF EXISTS "Authenticated users can view incident events" ON public.incident_events;
DROP POLICY IF EXISTS "Authenticated users can insert incident events" ON public.incident_events;

CREATE POLICY "All authenticated users can view incident events"
ON public.incident_events FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users with write role can insert incident events"
ON public.incident_events FOR INSERT TO authenticated
WITH CHECK (public.has_write_role(auth.uid()));

-- SLOS TABLE
DROP POLICY IF EXISTS "Authenticated users can view slos" ON public.slos;
DROP POLICY IF EXISTS "Authenticated users can insert slos" ON public.slos;
DROP POLICY IF EXISTS "Authenticated users can update slos" ON public.slos;

CREATE POLICY "All authenticated users can view slos"
ON public.slos FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users with write role can insert slos"
ON public.slos FOR INSERT TO authenticated
WITH CHECK (public.has_write_role(auth.uid()));

CREATE POLICY "Users with write role can update slos"
ON public.slos FOR UPDATE TO authenticated
USING (public.has_write_role(auth.uid()));