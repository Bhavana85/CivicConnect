-- CivicConnect Database Schema
-- Requires PostgreSQL 13+ with PostGIS extension

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS
-- =============================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(255)        NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20)  UNIQUE NOT NULL,
    password_hash   TEXT                NOT NULL,
    preferred_lang  VARCHAR(5)  DEFAULT 'en' CHECK (preferred_lang IN ('en', 'kn')),
    is_verified     BOOLEAN     DEFAULT FALSE,
    ward_number     INT,
    role            VARCHAR(20) DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin', 'moderator', 'government')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- GOVERNMENT ENTITIES
-- =============================================
CREATE TABLE government_entities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_name VARCHAR(255) NOT NULL,
    jurisdiction_type VARCHAR(50) CHECK (jurisdiction_type IN ('ward', 'pincode', 'district')),
    jurisdiction_value VARCHAR(100) NOT NULL,
    contact_email   VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RESIDENCY VERIFICATIONS
-- =============================================
CREATE TABLE residency_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    method          VARCHAR(20) CHECK (method IN ('otp_phone', 'address_doc')),
    otp_hash        TEXT,
    otp_expires_at  TIMESTAMPTZ,
    document_url    TEXT,
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ISSUE REPORTS (with PostGIS spatial column)
-- =============================================
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    category        VARCHAR(50) NOT NULL
                    CHECK (category IN ('pothole','streetlight','water','sewage','garbage','other')),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    address_text    VARCHAR(500),
    status          VARCHAR(30) DEFAULT 'SUBMITTED'
                    CHECK (status IN ('SUBMITTED','UNDER_REVIEW','VERIFIED','ASSIGNED','IN_PROGRESS','RESOLVED','REJECTED')),
    priority        VARCHAR(20) DEFAULT 'MEDIUM'
                    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    photo_url       TEXT,
    after_photo_url TEXT,
    upvotes         INT DEFAULT 0,
    ward_number     INT,
    assigned_to     VARCHAR(255),
    resolved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_location ON reports USING GIST (location);
CREATE INDEX idx_reports_status ON reports (status);
CREATE INDEX idx_reports_priority ON reports (priority);
CREATE INDEX idx_reports_category ON reports (category);
CREATE INDEX idx_reports_ward ON reports (ward_number);

-- =============================================
-- REPORT STATUS HISTORY
-- =============================================
CREATE TABLE report_status_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id       UUID REFERENCES reports(id) ON DELETE CASCADE,
    old_status      VARCHAR(30),
    new_status      VARCHAR(30) NOT NULL,
    remark          TEXT,
    changed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_by_name VARCHAR(255),
    changed_by_role VARCHAR(50) DEFAULT 'admin',
    changed_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_status_history_report ON report_status_history (report_id);
CREATE INDEX idx_status_history_changed_at ON report_status_history (changed_at DESC);

-- =============================================
-- REPORT COMMENTS
-- =============================================
CREATE TABLE report_comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id       UUID REFERENCES reports(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_report_comments_report ON report_comments (report_id);

-- =============================================
-- REPORT LIKES
-- =============================================
CREATE TABLE report_likes (
    report_id       UUID REFERENCES reports(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (report_id, user_id)
);

-- =============================================
-- BUDGET ITEMS
-- =============================================
CREATE TABLE budget_items (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiscal_year      INT         NOT NULL,
    department       VARCHAR(255) NOT NULL,
    category         VARCHAR(100) NOT NULL,
    allocated_amount NUMERIC(15,2) NOT NULL,
    spent_amount     NUMERIC(15,2) DEFAULT 0,
    currency         VARCHAR(3)  DEFAULT 'INR',
    description      TEXT,
    last_updated     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_year ON budget_items (fiscal_year);

-- =============================================
-- FORUM POSTS
-- =============================================
CREATE TABLE forum_posts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    parent_id       UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    ward_number     INT,
    title           VARCHAR(255),
    body            TEXT NOT NULL,
    upvotes         INT DEFAULT 0,
    is_pinned       BOOLEAN DEFAULT FALSE,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forum_ward ON forum_posts (ward_number);
CREATE INDEX idx_forum_parent ON forum_posts (parent_id);

-- =============================================
-- ALERTS
-- =============================================
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type      VARCHAR(50) CHECK (alert_type IN ('road_closure','weather','event','emergency')),
    title_en        VARCHAR(255) NOT NULL,
    title_kn        VARCHAR(255),
    body_en         TEXT        NOT NULL,
    body_kn         TEXT,
    severity        VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
    ward_numbers    INT[],
    is_active       BOOLEAN DEFAULT TRUE,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Updated_at trigger function
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_forum_updated_at
    BEFORE UPDATE ON forum_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
