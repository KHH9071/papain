-- Phase 4: 라운지 (커뮤니티) 테이블
-- Supabase 대시보드 SQL Editor에서 실행

-- ── lounge_posts ──────────────────────────────────────────────────────────────
CREATE TABLE lounge_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'review', 'growth', 'question')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  -- 비정규화: 빠른 목록 렌더링용
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lounge_posts ENABLE ROW LEVEL SECURITY;

-- 누구나 읽을 수 있음 (비로그인도)
CREATE POLICY "Anyone can read posts"
  ON lounge_posts FOR SELECT USING (true);
CREATE POLICY "Users can insert own posts"
  ON lounge_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts"
  ON lounge_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts"
  ON lounge_posts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_lounge_posts
  BEFORE UPDATE ON lounge_posts
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 목록 정렬 인덱스
CREATE INDEX idx_lounge_posts_created ON lounge_posts (created_at DESC);
CREATE INDEX idx_lounge_posts_category ON lounge_posts (category, created_at DESC);

-- ── lounge_comments ──────────────────────────────────────────────────────────
CREATE TABLE lounge_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES lounge_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lounge_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON lounge_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own comments"
  ON lounge_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments"
  ON lounge_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments"
  ON lounge_comments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_lounge_comments
  BEFORE UPDATE ON lounge_comments
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE INDEX idx_lounge_comments_post ON lounge_comments (post_id, created_at ASC);

-- ── lounge_likes ─────────────────────────────────────────────────────────────
CREATE TABLE lounge_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES lounge_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE lounge_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read likes"
  ON lounge_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own likes"
  ON lounge_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes"
  ON lounge_likes FOR DELETE USING (auth.uid() = user_id);

-- ── 카운트 동기화 함수 ───────────────────────────────────────────────────────
-- 댓글 수 동기화
CREATE OR REPLACE FUNCTION sync_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lounge_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lounge_posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_comment_count
  AFTER INSERT OR DELETE ON lounge_comments
  FOR EACH ROW EXECUTE FUNCTION sync_comment_count();

-- 좋아요 수 동기화
CREATE OR REPLACE FUNCTION sync_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lounge_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lounge_posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_like_count
  AFTER INSERT OR DELETE ON lounge_likes
  FOR EACH ROW EXECUTE FUNCTION sync_like_count();
