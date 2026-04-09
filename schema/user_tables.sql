-- Phase 1-1: 사용자 인증 관련 테이블
-- Supabase 대시보드 SQL Editor에서 실행

-- moddatetime 확장 활성화 (updated_at 자동 갱신용)
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- ── user_profiles ─────────────────────────────────────────────────────────────
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  child_name TEXT,
  child_dob DATE,
  gender TEXT CHECK (gender IN ('M', 'F')),
  months_old INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE TRIGGER set_updated_at_user_profiles
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ── user_growth_records ───────────────────────────────────────────────────────
CREATE TABLE user_growth_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  height NUMERIC NOT NULL,
  weight NUMERIC NOT NULL,
  months_old INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, months_old)
);

ALTER TABLE user_growth_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own growth records"
  ON user_growth_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own growth records"
  ON user_growth_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own growth records"
  ON user_growth_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own growth records"
  ON user_growth_records FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_user_growth_records
  BEFORE UPDATE ON user_growth_records
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ── user_product_selections ──────────────────────────────────────────────────
CREATE TABLE user_product_selections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  product_snapshot JSONB NOT NULL,
  daily_serving_count NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE user_product_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own product selections"
  ON user_product_selections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own product selections"
  ON user_product_selections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own product selections"
  ON user_product_selections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own product selections"
  ON user_product_selections FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_user_product_selections
  BEFORE UPDATE ON user_product_selections
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
