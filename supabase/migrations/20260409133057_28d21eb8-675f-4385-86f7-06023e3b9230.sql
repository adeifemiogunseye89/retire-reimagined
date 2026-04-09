
-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  age INTEGER,
  years_in_service INTEGER,
  grade_level TEXT,
  sector TEXT CHECK (sector IN ('Teaching', 'Health', 'Local Government', 'Other')),
  current_salary NUMERIC(12,2),
  pension_projection NUMERIC(12,2),
  skills JSONB DEFAULT '[]'::JSONB,
  business_interests JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- AI Reports table
CREATE TABLE public.ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  readiness_score INTEGER CHECK (readiness_score BETWEEN 1 AND 100),
  pension_gap NUMERIC(12,2),
  top_business_ideas JSONB,
  report_json JSONB,
  generated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports" ON public.ai_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON public.ai_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Business Ideas table
CREATE TABLE public.business_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  idea_title TEXT NOT NULL,
  description TEXT,
  projected_monthly_income NUMERIC(12,2),
  gamma_deck_url TEXT,
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'launched', 'scaled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.business_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ideas" ON public.business_ideas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ideas" ON public.business_ideas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ideas" ON public.business_ideas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ideas" ON public.business_ideas FOR DELETE USING (auth.uid() = user_id);

-- User Metrics table
CREATE TABLE public.user_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  side_income NUMERIC(12,2) DEFAULT 0,
  businesses_launched INTEGER DEFAULT 0,
  students_enrolled INTEGER DEFAULT 0,
  anxiety_score INTEGER DEFAULT 50,
  last_updated TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own metrics" ON public.user_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own metrics" ON public.user_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own metrics" ON public.user_metrics FOR UPDATE USING (auth.uid() = user_id);

-- Events / Announcements table
CREATE TABLE public.events_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('workshop', 'seminar', 'webinar', 'training')),
  date TIMESTAMPTZ NOT NULL,
  description TEXT,
  link TEXT,
  sector TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.events_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active events" ON public.events_announcements FOR SELECT USING (is_active = true);
