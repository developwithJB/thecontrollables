
-- Table to log admin broadcast campaigns
CREATE TABLE public.admin_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sent_by UUID NOT NULL,
  segment_type TEXT NOT NULL, -- 'manual', 'all_free', 'all_paid', 'all', 'inactive_3d', 'inactive_7d', 'no_snapshot', 'completed_no_new'
  segment_emails TEXT[] DEFAULT '{}', -- for manual segment
  template_key TEXT NOT NULL DEFAULT 'custom', -- 're_engagement', 'milestone', 'announcement', 'custom'
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

-- Only admins can access
CREATE POLICY "Admins can view broadcasts"
  ON public.admin_broadcasts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert broadcasts"
  ON public.admin_broadcasts FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
