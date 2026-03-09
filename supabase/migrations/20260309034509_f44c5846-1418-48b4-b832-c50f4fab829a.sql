
-- Planner item types and statuses
CREATE TYPE public.planner_item_type AS ENUM ('task', 'time_block', 'routine_instance', 'external_event');
CREATE TYPE public.planner_item_status AS ENUM ('todo', 'in_progress', 'done', 'skipped');

-- Core planner items table
CREATE TABLE public.planner_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type public.planner_item_type NOT NULL DEFAULT 'task',
  status public.planner_item_status NOT NULL DEFAULT 'todo',
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  energy_level TEXT CHECK (energy_level IN ('low','medium','high')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  routine_id UUID,
  external_event_id TEXT,
  connection_id UUID,
  snapshot_action_ref JSONB,
  promise_id UUID,
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recurring routine templates
CREATE TABLE public.planner_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  recurrence TEXT NOT NULL DEFAULT 'daily',
  recurrence_days INTEGER[] DEFAULT '{}',
  default_start_time TIME,
  default_end_time TIME,
  energy_level TEXT CHECK (energy_level IN ('low','medium','high')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Calendar provider connections
CREATE TABLE public.planner_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_ids JSONB DEFAULT '[]',
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider, provider_account_id)
);

-- Sync audit logs
CREATE TABLE public.planner_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.planner_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  events_imported INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from planner_items to planner_routines and planner_connections
ALTER TABLE public.planner_items
  ADD CONSTRAINT planner_items_routine_id_fkey FOREIGN KEY (routine_id) REFERENCES public.planner_routines(id) ON DELETE SET NULL,
  ADD CONSTRAINT planner_items_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.planner_connections(id) ON DELETE SET NULL,
  ADD CONSTRAINT planner_items_promise_id_fkey FOREIGN KEY (promise_id) REFERENCES public.integrity_logs(id) ON DELETE SET NULL;

-- updated_at triggers
CREATE TRIGGER update_planner_items_updated_at BEFORE UPDATE ON public.planner_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planner_routines_updated_at BEFORE UPDATE ON public.planner_routines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planner_connections_updated_at BEFORE UPDATE ON public.planner_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.planner_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_sync_logs ENABLE ROW LEVEL SECURITY;

-- planner_items: full CRUD for own rows
CREATE POLICY "Users can select own planner items" ON public.planner_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own planner items" ON public.planner_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own planner items" ON public.planner_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own planner items" ON public.planner_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- planner_routines: full CRUD for own rows
CREATE POLICY "Users can select own planner routines" ON public.planner_routines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own planner routines" ON public.planner_routines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own planner routines" ON public.planner_routines FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own planner routines" ON public.planner_routines FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- planner_connections: full CRUD for own rows
CREATE POLICY "Users can select own planner connections" ON public.planner_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own planner connections" ON public.planner_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own planner connections" ON public.planner_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own planner connections" ON public.planner_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- planner_sync_logs: read-only for own rows
CREATE POLICY "Users can select own sync logs" ON public.planner_sync_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
