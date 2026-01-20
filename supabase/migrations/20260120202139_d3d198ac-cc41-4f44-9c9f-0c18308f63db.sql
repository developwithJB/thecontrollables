-- Create app_events table for anonymous event tracking
CREATE TABLE public.app_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  page_path TEXT,
  session_id TEXT,
  user_agent TEXT,
  screen_size TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create app_errors table for error tracing
CREATE TABLE public.app_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_type TEXT,
  component_name TEXT,
  page_path TEXT,
  session_id TEXT,
  user_agent TEXT,
  additional_context JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create app_analytics table for aggregated analytics
CREATE TABLE public.app_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC DEFAULT 0,
  dimensions JSONB DEFAULT '{}',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create page_views table for page analytics
CREATE TABLE public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL,
  referrer TEXT,
  session_id TEXT,
  user_agent TEXT,
  screen_size TEXT,
  load_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Create policies allowing anonymous inserts (for tracking)
CREATE POLICY "Allow anonymous insert for events"
ON public.app_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anonymous insert for errors"
ON public.app_errors
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anonymous insert for page views"
ON public.page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Analytics are only inserted by service role (no public insert)
-- Admin read policies will be handled via edge function with service role

-- Create indexes for efficient querying
CREATE INDEX idx_app_events_created_at ON public.app_events(created_at DESC);
CREATE INDEX idx_app_events_event_type ON public.app_events(event_type);
CREATE INDEX idx_app_errors_created_at ON public.app_errors(created_at DESC);
CREATE INDEX idx_app_errors_resolved ON public.app_errors(resolved);
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX idx_page_views_page_path ON public.page_views(page_path);
CREATE INDEX idx_app_analytics_metric_type ON public.app_analytics(metric_type);