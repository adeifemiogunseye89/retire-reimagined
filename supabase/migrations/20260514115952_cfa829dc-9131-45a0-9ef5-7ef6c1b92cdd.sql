CREATE TABLE public.live_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  room_url TEXT NOT NULL,
  room_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  attendee_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own live sessions" ON public.live_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own live sessions" ON public.live_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own live sessions" ON public.live_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own live sessions" ON public.live_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_live_sessions_user_scheduled ON public.live_sessions(user_id, scheduled_at DESC);

CREATE TRIGGER update_live_sessions_updated_at
BEFORE UPDATE ON public.live_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();