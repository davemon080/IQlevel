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
