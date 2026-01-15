-- Create user_entitlements table for tracking paid access
CREATE TABLE public.user_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entitlement_type TEXT NOT NULL DEFAULT 'full_access',
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    granted_by TEXT,
    source TEXT NOT NULL CHECK (source IN ('stripe', 'manual', 'promo')),
    expires_at TIMESTAMP WITH TIME ZONE,
    stripe_session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, entitlement_type)
);

-- Enable RLS
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- Users can only read their own entitlements
CREATE POLICY "Users can view their own entitlements"
ON public.user_entitlements
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_entitlements_user_id ON public.user_entitlements(user_id);
CREATE INDEX idx_user_entitlements_type ON public.user_entitlements(entitlement_type);