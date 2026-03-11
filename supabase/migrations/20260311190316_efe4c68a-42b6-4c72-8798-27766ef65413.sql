
-- 1. Create enums
CREATE TYPE public.season_status AS ENUM ('active', 'closed');
CREATE TYPE public.project_status AS ENUM ('active', 'paused', 'complete');
CREATE TYPE public.controllable_focus AS ENUM ('awareness', 'perspective', 'habit', 'wellness', 'environment');

-- 2. Alter seasons table
ALTER TABLE public.seasons
  ADD COLUMN theme_text text,
  ADD COLUMN ends_at timestamptz,
  ADD COLUMN controllable_focus public.controllable_focus;

-- 3. Create projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  season_id uuid REFERENCES public.seasons(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text DEFAULT '📌',
  color_hex text DEFAULT '#6366f1',
  controllable public.controllable_focus,
  status public.project_status DEFAULT 'active',
  momentum_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT momentum_score_range CHECK (momentum_score >= 0 AND momentum_score <= 100)
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own projects" ON public.projects FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 4. Create project_calendar_mappings table
CREATE TABLE public.project_calendar_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  calendar_event_keyword text NOT NULL,
  gcal_calendar_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.project_calendar_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own mappings" ON public.project_calendar_mappings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own mappings" ON public.project_calendar_mappings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own mappings" ON public.project_calendar_mappings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own mappings" ON public.project_calendar_mappings FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 5. Add project_id FK to planner_items
ALTER TABLE public.planner_items ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- 6. Add project_id FK to health_sync_data
ALTER TABLE public.health_sync_data ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
