-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy', 'degraded', 'critical', 'unknown')),
  uptime DECIMAL(5,2) DEFAULT 100.00,
  latency_p50 INTEGER DEFAULT 0,
  latency_p99 INTEGER DEFAULT 0,
  error_rate DECIMAL(5,2) DEFAULT 0.00,
  requests_per_second INTEGER DEFAULT 0,
  cpu_usage DECIMAL(5,2) DEFAULT 0.00,
  memory_usage DECIMAL(5,2) DEFAULT 0.00,
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert services" ON public.services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update services" ON public.services FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete services" ON public.services FOR DELETE TO authenticated USING (true);

-- Create metrics table for time-series data
CREATE TABLE public.metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  value DECIMAL(15,4) NOT NULL,
  unit TEXT,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view metrics" ON public.metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert metrics" ON public.metrics FOR INSERT TO authenticated WITH CHECK (true);

-- Create incidents table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'ongoing', 'resolved')),
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  triggered_by TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view incidents" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update incidents" ON public.incidents FOR UPDATE TO authenticated USING (true);

-- Create incident timeline events
CREATE TABLE public.incident_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('triggered', 'acknowledged', 'escalated', 'resolved', 'comment')),
  message TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view incident events" ON public.incident_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert incident events" ON public.incident_events FOR INSERT TO authenticated WITH CHECK (true);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info')),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  threshold DECIMAL(15,4) NOT NULL,
  current_value DECIMAL(15,4) NOT NULL,
  fired_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  silenced_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view alerts" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update alerts" ON public.alerts FOR UPDATE TO authenticated USING (true);

-- Create logs table
CREATE TABLE public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
  message TEXT NOT NULL,
  metadata JSONB,
  trace_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view logs" ON public.logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert logs" ON public.logs FOR INSERT TO authenticated WITH CHECK (true);

-- Create SLOs table
CREATE TABLE public.slos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  target_availability DECIMAL(5,2) NOT NULL DEFAULT 99.9,
  current_availability DECIMAL(5,2) NOT NULL DEFAULT 100.0,
  target_latency_p99 INTEGER DEFAULT 500,
  current_latency_p99 INTEGER DEFAULT 0,
  error_budget DECIMAL(5,2) DEFAULT 0.1,
  error_budget_consumed DECIMAL(5,2) DEFAULT 0.0,
  period TEXT DEFAULT '30d',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.slos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view slos" ON public.slos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert slos" ON public.slos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update slos" ON public.slos FOR UPDATE TO authenticated USING (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.metrics;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_slos_updated_at BEFORE UPDATE ON public.slos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();