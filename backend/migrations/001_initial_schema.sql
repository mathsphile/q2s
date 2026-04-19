-- Migration: 001_initial_schema
-- Description: Create initial database tables for Quest@Stellar platform
-- Tables: users, sessions, login_attempts, disputes, failed_transactions

BEGIN;

-- =============================================================================
-- Users table
-- Stores registered user accounts with role, wallet, and reputation data
-- =============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'organizer', 'ambassador')),
    wallet_address VARCHAR(56),
    is_banned BOOLEAN DEFAULT FALSE,
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- Sessions table
-- Stores active JWT sessions for authenticated users
-- =============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- Login attempts table
-- Records login attempts for rate limiting (max 10 failed per 15 min window)
-- =============================================================================
CREATE TABLE login_attempts (
    email VARCHAR(255) NOT NULL,
    attempted_at TIMESTAMP DEFAULT NOW(),
    success BOOLEAN NOT NULL
);

-- =============================================================================
-- Disputes table
-- Tracks disputes raised by ambassadors on rejected submissions
-- =============================================================================
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id BIGINT NOT NULL,
    quest_id BIGINT NOT NULL,
    ambassador_id UUID REFERENCES users(id),
    reason TEXT NOT NULL,
    admin_id UUID REFERENCES users(id),
    resolution VARCHAR(20) CHECK (resolution IN ('pending', 'ambassador_wins', 'organizer_wins')),
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- =============================================================================
-- Failed transactions table
-- Logs failed blockchain transactions for retry and admin review
-- =============================================================================
CREATE TABLE failed_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id),
    error_details TEXT NOT NULL,
    quest_id BIGINT,
    amount BIGINT,
    retry_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Users: fast lookup by email for login and registration uniqueness checks
CREATE INDEX idx_users_email ON users (email);

-- Sessions: fast lookup by user_id for session management and revocation
CREATE INDEX idx_sessions_user_id ON sessions (user_id);

-- Login attempts: fast lookup by email for rate limiting queries
CREATE INDEX idx_login_attempts_email ON login_attempts (email);

-- Disputes: fast lookup by quest_id and ambassador_id
CREATE INDEX idx_disputes_quest_id ON disputes (quest_id);
CREATE INDEX idx_disputes_ambassador_id ON disputes (ambassador_id);

-- Failed transactions: fast lookup by user_id and quest_id for retry and admin review
CREATE INDEX idx_failed_transactions_user_id ON failed_transactions (user_id);
CREATE INDEX idx_failed_transactions_quest_id ON failed_transactions (quest_id);

COMMIT;
