# StudentLink - Full Database Migration SQL (PostgreSQL / Supabase)

Run this script directly in your Supabase SQL editor.

What it does:
- Creates missing tables
- Adds missing columns
- Aligns important column types where safe
- Skips objects that already match
- Rebuilds `post_likes` and `post_comments` using the actual runtime types of `posts.id` and `users.uid`

Note:
- Rebuilding `post_likes` and `post_comments` drops old data in those two tables.
- Script is idempotent (safe to rerun).

```sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================
-- 1) USERS
-- =========================================
CREATE TABLE IF NOT EXISTS users (
    uid UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    photo_url TEXT,
    cover_photo_url TEXT,
    role TEXT NOT NULL DEFAULT 'freelancer',
    bio TEXT,
    status TEXT,
    location TEXT,
    skills JSONB,
    education JSONB,
    experience JSONB,
    social_links JSONB,
    portfolio JSONB,
    company_info JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS skills JSONB,
  ADD COLUMN IF NOT EXISTS education JSONB,
  ADD COLUMN IF NOT EXISTS experience JSONB,
  ADD COLUMN IF NOT EXISTS social_links JSONB,
  ADD COLUMN IF NOT EXISTS portfolio JSONB,
  ADD COLUMN IF NOT EXISTS company_info JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

UPDATE users SET role = 'freelancer' WHERE role IS NULL;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'freelancer';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('freelancer','client','admin'));
  END IF;
END $$;

-- =========================================
-- 2) POSTS
-- =========================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_uid UUID REFERENCES users(uid) ON DELETE SET NULL,
    author_name TEXT,
    author_photo TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    type TEXT NOT NULL DEFAULT 'social',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS author_uid UUID,
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS author_photo TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_type_check'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_type_check CHECK (type IN ('social','job'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_author_uid ON posts(author_uid);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- =========================================
-- 3) JOBS
-- =========================================
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_uid UUID REFERENCES users(uid) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    budget NUMERIC(14,2) NOT NULL DEFAULT 0,
    category TEXT,
    is_student_friendly BOOLEAN NOT NULL DEFAULT TRUE,
    is_remote BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS client_uid UUID,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS budget NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS is_student_friendly BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_remote BOOLEAN,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

UPDATE jobs SET is_student_friendly = TRUE WHERE is_student_friendly IS NULL;
UPDATE jobs SET is_remote = FALSE WHERE is_remote IS NULL;
UPDATE jobs SET status = 'open' WHERE status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_status_check'
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_status_check CHECK (status IN ('open','closed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_client_uid ON jobs(client_uid);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- =========================================
-- 4) PROPOSALS (APPLICATIONS)
-- =========================================
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    freelancer_uid UUID REFERENCES users(uid) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    budget NUMERIC(14,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS freelancer_uid UUID,
  ADD COLUMN IF NOT EXISTS job_id UUID,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS budget NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

UPDATE proposals SET status = 'pending' WHERE status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_status_check'
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_status_check CHECK (status IN ('pending','accepted','rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proposals_job_id ON proposals(job_id);
CREATE INDEX IF NOT EXISTS idx_proposals_freelancer_uid ON proposals(freelancer_uid);

-- =========================================
-- 5) MESSAGES + ACTIVE CHATS
-- =========================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_uid UUID REFERENCES users(uid) ON DELETE CASCADE,
    receiver_uid UUID REFERENCES users(uid) ON DELETE CASCADE,
    content TEXT,
    attachments JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS sender_uid UUID,
  ADD COLUMN IF NOT EXISTS receiver_uid UUID,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS attachments JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_messages_pair_time
  ON messages(sender_uid, receiver_uid, created_at DESC);

CREATE TABLE IF NOT EXISTS active_chats (
    user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    other_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    last_message TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_uid, other_uid)
);

ALTER TABLE active_chats
  ADD COLUMN IF NOT EXISTS user_uid UUID,
  ADD COLUMN IF NOT EXISTS other_uid UUID,
  ADD COLUMN IF NOT EXISTS last_message TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_active_chats_user_updated
  ON active_chats(user_uid, updated_at DESC);

-- =========================================
-- 6) FRIEND REQUESTS + CONNECTIONS
-- =========================================
CREATE TABLE IF NOT EXISTS friend_requests (
    id BIGSERIAL PRIMARY KEY,
    from_uid UUID REFERENCES users(uid) ON DELETE CASCADE,
    from_name TEXT,
    from_photo TEXT,
    to_uid UUID REFERENCES users(uid) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE friend_requests
  ADD COLUMN IF NOT EXISTS from_uid UUID,
  ADD COLUMN IF NOT EXISTS from_name TEXT,
  ADD COLUMN IF NOT EXISTS from_photo TEXT,
  ADD COLUMN IF NOT EXISTS to_uid UUID,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

UPDATE friend_requests SET status = 'pending' WHERE status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'friend_requests_status_check'
  ) THEN
    ALTER TABLE friend_requests
      ADD CONSTRAINT friend_requests_status_check CHECK (status IN ('pending','accepted','rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_friend_requests_to_uid ON friend_requests(to_uid);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from_uid ON friend_requests(from_uid);

CREATE TABLE IF NOT EXISTS connections (
    id BIGSERIAL PRIMARY KEY,
    uids JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE connections
  ADD COLUMN IF NOT EXISTS uids JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_connections_uids_gin ON connections USING GIN (uids);

-- =========================================
-- 7) WALLETS + WALLET TRANSACTIONS
-- =========================================
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uid UUID NOT NULL UNIQUE REFERENCES users(uid) ON DELETE CASCADE,
    usd_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    ngn_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    eur_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS user_uid UUID,
  ADD COLUMN IF NOT EXISTS usd_balance NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS ngn_balance NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS eur_balance NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

UPDATE wallets SET usd_balance = 0 WHERE usd_balance IS NULL;
UPDATE wallets SET ngn_balance = 0 WHERE ngn_balance IS NULL;
UPDATE wallets SET eur_balance = 0 WHERE eur_balance IS NULL;

ALTER TABLE wallets
  ALTER COLUMN usd_balance SET DEFAULT 0,
  ALTER COLUMN ngn_balance SET DEFAULT 0,
  ALTER COLUMN eur_balance SET DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallets_user_uid ON wallets(user_uid);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('USD','NGN','EUR')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('topup','withdraw')),
    method VARCHAR(20) NOT NULL CHECK (method IN ('card','transfer')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('completed','pending','failed')),
    reference TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS user_uid UUID,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
  ON wallet_transactions(user_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference
  ON wallet_transactions(reference);

-- =========================================
-- 8) POST LIKES + POST COMMENTS
--    (rebuild with dynamic FK types)
-- =========================================
DO $$
DECLARE
  post_id_type TEXT;
  user_uid_type TEXT;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
    INTO post_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'posts'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod)
    INTO user_uid_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'users'
    AND a.attname = 'uid'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF post_id_type IS NULL OR user_uid_type IS NULL THEN
    RAISE EXCEPTION 'posts.id or users.uid not found. Ensure core tables exist first.';
  END IF;

  DROP TABLE IF EXISTS post_likes CASCADE;
  DROP TABLE IF EXISTS post_comments CASCADE;

  EXECUTE format(
    'CREATE TABLE post_likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id %s NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_uid %s NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_post_like UNIQUE (post_id, user_uid)
    )',
    post_id_type, user_uid_type
  );

  EXECUTE 'CREATE INDEX idx_post_likes_post ON post_likes(post_id)';
  EXECUTE 'CREATE INDEX idx_post_likes_user ON post_likes(user_uid)';

  EXECUTE format(
    'CREATE TABLE post_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id %s NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_uid %s NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
      author_name VARCHAR(255) NOT NULL,
      author_photo TEXT,
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )',
    post_id_type, user_uid_type
  );

  EXECUTE 'CREATE INDEX idx_post_comments_post_created ON post_comments(post_id, created_at ASC)';
  EXECUTE 'CREATE INDEX idx_post_comments_user ON post_comments(user_uid)';
END $$;

COMMIT;
```

## Profile + Performance Patch (Run After Main Script)

Use this idempotent patch to support copyable public user IDs, richer profiles, and faster reads:

```sql
BEGIN;

-- 1) Users profile upgrades
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS public_id TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill public_id for existing rows
UPDATE users
SET public_id = 'SL-' || UPPER(SUBSTRING(REPLACE(uid::text, '-', '') FROM 1 FOR 10))
WHERE public_id IS NULL OR public_id = '';

-- Ensure public_id uniqueness and fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_public_id ON users(public_id);
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
CREATE INDEX IF NOT EXISTS idx_users_role_created ON users(role, created_at DESC);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- 2) Friend request read-performance indexes
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_status_created
  ON friend_requests(to_uid, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from_status_created
  ON friend_requests(from_uid, status, created_at DESC);

-- 3) Post engagement read-performance indexes
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created_desc
  ON post_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_user
  ON post_likes(post_id, user_uid);

-- 4) Wallet transfer lookup/index speed
CREATE INDEX IF NOT EXISTS idx_wallets_user_uid_updated
  ON wallets(user_uid, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_currency_created
  ON wallet_transactions(user_uid, currency, created_at DESC);

COMMIT;
```
