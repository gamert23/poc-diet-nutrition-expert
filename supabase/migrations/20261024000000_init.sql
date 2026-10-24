-- Schema from SRD section 4, plus the columns FR-3.2 (cooking equipment) and
-- FR-4.2 (budget) need. All access goes through Next.js route handlers using the
-- service role key after the LIFF ID token is verified, so RLS is enabled with
-- no policies: anon/authenticated clients get nothing.

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_user_id VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    age INT NOT NULL CHECK (age BETWEEN 13 AND 120),
    height_cm NUMERIC(5,2) NOT NULL CHECK (height_cm > 0),
    current_weight_kg NUMERIC(5,2) NOT NULL CHECK (current_weight_kg > 0),
    target_weight_kg NUMERIC(5,2) NOT NULL CHECK (target_weight_kg > 0),
    activity_level VARCHAR(50) CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
    bmr NUMERIC(6,2),
    tdee NUMERIC(6,2),
    target_calories NUMERIC(6,2),
    protein_target_g NUMERIC(5,2),
    carbs_target_g NUMERIC(5,2),
    fat_target_g NUMERIC(5,2),
    medical_conditions TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    cooking_equipment TEXT[] DEFAULT '{}',
    daily_budget_thb NUMERIC(8,2),
    daily_summary_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.meal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    meal_type VARCHAR(20) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    food_name VARCHAR(255) NOT NULL,
    image_url TEXT,
    calories NUMERIC(6,2) NOT NULL,
    protein_g NUMERIC(5,2) DEFAULT 0,
    carbs_g NUMERIC(5,2) DEFAULT 0,
    fat_g NUMERIC(5,2) DEFAULT 0,
    sodium_mg NUMERIC(6,2) DEFAULT 0,
    sugar_g NUMERIC(5,2) DEFAULT 0,
    warning_flags TEXT[] DEFAULT '{}',
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX meal_logs_user_logged_at_idx ON public.meal_logs (user_id, logged_at DESC);

CREATE TABLE public.meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    meal_type VARCHAR(20) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    recipe_name VARCHAR(255) NOT NULL,
    ingredients JSONB NOT NULL,
    instructions TEXT[],
    estimated_calories NUMERIC(6,2),
    estimated_protein_g NUMERIC(5,2),
    estimated_carbs_g NUMERIC(5,2),
    estimated_fat_g NUMERIC(5,2),
    estimated_cost_thb NUMERIC(8,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX meal_plans_user_date_idx ON public.meal_plans (user_id, plan_date);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- Private bucket for food and fridge photos; the app serves them via signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-photos', 'food-photos', false)
ON CONFLICT (id) DO NOTHING;
