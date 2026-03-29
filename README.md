# StudentLink - Database Schema

This document outlines the database schema for the StudentLink application. While the application currently uses **Firebase Firestore** (NoSQL), the following SQL schema represents the equivalent relational structure for reference or migration purposes.

## SQL Schema (PostgreSQL/Standard SQL)

You can use the following SQL commands to create the necessary tables.

```sql
-- Users Table
CREATE TABLE users (
    uid VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    photo_url TEXT,
    cover_photo_url TEXT,
    role VARCHAR(50) CHECK (role IN ('freelancer', 'client', 'admin')) NOT NULL,
    bio TEXT,
    status VARCHAR(255),
    location VARCHAR(255),
    skills JSONB, -- Array of strings
    education JSONB, -- Object: {university, degree, year, verified}
    experience JSONB, -- Array of objects: [{title, company, type, period, description}]
    social_links JSONB, -- Object: {linkedin, github, twitter, website}
    portfolio JSONB, -- Array of objects: [{title, imageUrl, link}]
    company_info JSONB, -- Object: {name, about}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts Table
CREATE TABLE posts (
    id VARCHAR(255) PRIMARY KEY,
    author_uid VARCHAR(255) REFERENCES users(uid),
    author_name VARCHAR(255),
    author_photo TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    type VARCHAR(50) CHECK (type IN ('social', 'job')) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

-- Jobs Table
CREATE TABLE jobs (
    id VARCHAR(255) PRIMARY KEY,
    client_uid VARCHAR(255) REFERENCES users(uid),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    budget DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    is_student_friendly BOOLEAN DEFAULT TRUE,
    is_remote BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    created_at TIMESTAMP NOT NULL
);

-- Proposals Table
CREATE TABLE proposals (
    id VARCHAR(255) PRIMARY KEY,
    freelancer_uid VARCHAR(255) REFERENCES users(uid),
    job_id VARCHAR(255) REFERENCES jobs(id),
    content TEXT NOT NULL,
    budget DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL
);

-- Messages Table
CREATE TABLE messages (
    id VARCHAR(255) PRIMARY KEY,
    sender_uid VARCHAR(255) REFERENCES users(uid),
    receiver_uid VARCHAR(255) REFERENCES users(uid),
    content TEXT,
    attachments JSONB, -- Array of objects: [{name, url, type, size}]
    created_at TIMESTAMP NOT NULL
);

-- Active Chats (Summary table for quick access)
CREATE TABLE active_chats (
    user_uid VARCHAR(255) REFERENCES users(uid),
    other_uid VARCHAR(255) REFERENCES users(uid),
    last_message TEXT,
    updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (user_uid, other_uid)
);

-- Friend Requests Table
CREATE TABLE friend_requests (
    id SERIAL PRIMARY KEY,
    from_uid VARCHAR(255) REFERENCES users(uid),
    from_name VARCHAR(255),
    from_photo TEXT,
    to_uid VARCHAR(255) REFERENCES users(uid),
    status VARCHAR(50) CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL
);

-- Connections Table
CREATE TABLE connections (
    id SERIAL PRIMARY KEY,
    uids JSONB NOT NULL, -- Array containing exactly two user UIDs
    created_at TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_posts_author ON posts(author_uid);
CREATE INDEX idx_jobs_client ON jobs(client_uid);
CREATE INDEX idx_proposals_job ON proposals(job_id);
CREATE INDEX idx_messages_conversation ON messages(sender_uid, receiver_uid);
```

## Data Structure Notes

1.  **JSONB Fields:** In modern SQL databases like PostgreSQL, `JSONB` is used to store arrays and nested objects (like skills, education, and portfolio) while maintaining searchability.
2.  **UIDs:** The `uid` is the primary identifier provided by Firebase Authentication.
3.  **Relationships:** Foreign keys are used to maintain referential integrity between users, posts, jobs, and messages.

## How to Run

1.  Ensure you have a SQL-compatible database (e.g., PostgreSQL, MySQL, or SQLite).
2.  Copy the SQL code above.
3.  Execute the script in your database management tool (e.g., pgAdmin, DBeaver, or via CLI).

## Extended SQL For Current App Features (Append-Only)

The following SQL keeps your existing schema and adds missing tables/columns for all features currently in the app (wallet operations, transfers, post likes, and comments).

```sql
-- =========================
-- Core Extension Safety
-- =========================
-- Use IF NOT EXISTS / conditional ALTER to avoid breaking existing deployments.

-- =========================
-- Wallets
-- =========================
CREATE TABLE IF NOT EXISTS wallets (
    id BIGSERIAL PRIMARY KEY,
    user_uid VARCHAR(255) NOT NULL UNIQUE REFERENCES users(uid) ON DELETE CASCADE,
    usd_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    ngn_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    eur_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('USD', 'NGN', 'EUR')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('topup', 'withdraw')),
    method VARCHAR(20) NOT NULL CHECK (method IN ('card', 'transfer')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'pending', 'failed')),
    reference TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
  ON wallet_transactions(user_uid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference
  ON wallet_transactions(reference);

-- =========================
-- Post Likes
-- =========================
CREATE TABLE IF NOT EXISTS post_likes (
    id BIGSERIAL PRIMARY KEY,
    post_id VARCHAR(255) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_post_like UNIQUE (post_id, user_uid)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post
  ON post_likes(post_id);

CREATE INDEX IF NOT EXISTS idx_post_likes_user
  ON post_likes(user_uid);

-- =========================
-- Post Comments
-- =========================
CREATE TABLE IF NOT EXISTS post_comments (
    id BIGSERIAL PRIMARY KEY,
    post_id VARCHAR(255) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_uid VARCHAR(255) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    author_photo TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_created
  ON post_comments(post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_post_comments_user
  ON post_comments(user_uid);

-- =========================
-- Optional Hardening / Compatibility
-- =========================
-- Ensure messages table supports attachments JSONB in case older schema differs.
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'messages' AND column_name = 'attachments'
  ) THEN
      ALTER TABLE messages ADD COLUMN attachments JSONB;
  END IF;
END $$;

-- Ensure wallet_transactions has reference column for transfer traceability.
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'wallet_transactions' AND column_name = 'reference'
  ) THEN
      ALTER TABLE wallet_transactions ADD COLUMN reference TEXT;
  END IF;
END $$;

-- =========================
-- Recommended Transfer Reference Format (used by app)
-- =========================
-- transfer_out:<recipient_uid>:<transfer_ref>
-- transfer_in:<sender_uid>:<transfer_ref>
```

## Clean SQL Fix For UUID-Based Supabase Projects

If your existing `posts.id` (and `users.uid`) are `UUID`, use this clean script.  
This resolves errors like:
`foreign key constraint ... cannot be implemented ... incompatible types character varying and uuid`.

```sql
-- ======================================
-- UUID-safe schema for new app features
-- ======================================
-- Run in PostgreSQL / Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Ensure wallets tables use UUID user references
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uid UUID NOT NULL UNIQUE REFERENCES users(uid) ON DELETE CASCADE,
    usd_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    ngn_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    eur_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('USD', 'NGN', 'EUR')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('topup', 'withdraw')),
    method VARCHAR(20) NOT NULL CHECK (method IN ('card', 'transfer')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'pending', 'failed')),
    reference TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
  ON wallet_transactions(user_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference
  ON wallet_transactions(reference);

-- 2) Recreate post_likes and post_comments with UUID columns (safe if old wrong types exist)
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS post_comments CASCADE;

CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_post_like UNIQUE (post_id, user_uid)
);

CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_uid);

CREATE TABLE post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_uid UUID NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    author_photo TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_post_comments_post_created
  ON post_comments(post_id, created_at ASC);
CREATE INDEX idx_post_comments_user
  ON post_comments(user_uid);

-- 3) Optional: ensure messages.attachments exists
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'messages' AND column_name = 'attachments'
  ) THEN
      ALTER TABLE messages ADD COLUMN attachments JSONB;
  END IF;
END $$;

-- 4) Optional: ensure wallet_transactions.reference exists
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'wallet_transactions' AND column_name = 'reference'
  ) THEN
      ALTER TABLE wallet_transactions ADD COLUMN reference TEXT;
  END IF;
END $$;
```
