-- Create table to track daily AI message usage
CREATE TABLE public.ai_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own AI usage"
ON public.ai_usage_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own usage records
CREATE POLICY "Users can insert their own AI usage"
ON public.ai_usage_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage records
CREATE POLICY "Users can update their own AI usage"
ON public.ai_usage_logs
FOR UPDATE
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_ai_usage_logs_user_date ON public.ai_usage_logs(user_id, usage_date);

-- Trigger to update timestamp
CREATE TRIGGER update_ai_usage_logs_updated_at
BEFORE UPDATE ON public.ai_usage_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();