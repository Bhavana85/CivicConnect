-- Migration: 001_advanced_complaint_workflow.sql
-- Description: Upgrade complaint status to 7-stage workflow and create report_status_history table

BEGIN;

-- 1. Drop existing status check constraint if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'reports'::regclass AND conname = 'reports_status_check'
    ) THEN
        ALTER TABLE reports DROP CONSTRAINT reports_status_check;
    END IF;
END $$;

-- 2. Migrate existing lowercase status values to new uppercase workflow statuses
UPDATE reports SET status = 'SUBMITTED' WHERE status = 'pending';
UPDATE reports SET status = 'IN_PROGRESS' WHERE status = 'in_progress';
UPDATE reports SET status = 'RESOLVED' WHERE status = 'resolved';
UPDATE reports SET status = 'REJECTED' WHERE status = 'rejected';

-- 3. Set new default and add new check constraint
ALTER TABLE reports ALTER COLUMN status SET DEFAULT 'SUBMITTED';

ALTER TABLE reports ADD CONSTRAINT reports_status_check CHECK (
    status IN (
        'SUBMITTED',
        'UNDER_REVIEW',
        'VERIFIED',
        'ASSIGNED',
        'IN_PROGRESS',
        'RESOLVED',
        'REJECTED'
    )
);

-- 4. Create report_status_history table
CREATE TABLE IF NOT EXISTS report_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    remark TEXT,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_by_name VARCHAR(255),
    changed_by_role VARCHAR(50) DEFAULT 'admin',
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_report ON report_status_history (report_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON report_status_history (changed_at DESC);

-- 5. Backfill initial status history for existing reports that don't have history
INSERT INTO report_status_history (report_id, old_status, new_status, remark, changed_by_name, changed_by_role, changed_at)
SELECT 
    r.id,
    NULL,
    r.status,
    'Initial complaint submission',
    COALESCE(u.full_name, 'Citizen'),
    'citizen',
    r.created_at
FROM reports r
LEFT JOIN users u ON r.user_id = u.id
WHERE NOT EXISTS (
    SELECT 1 FROM report_status_history h WHERE h.report_id = r.id
);

COMMIT;
