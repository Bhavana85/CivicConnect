-- CivicConnect Database Migration: 002_complaint_priority.sql
-- Adds priority management (LOW, MEDIUM, HIGH, CRITICAL) to reports table

-- 1. Add priority column with check constraint
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'MEDIUM'
CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

-- 2. Create index on priority for fast filtering and sorting
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports (priority);

-- 3. Backfill any existing reports that have NULL priority
UPDATE reports 
SET priority = CASE 
    WHEN category = 'pothole' AND LOWER(title || ' ' || COALESCE(description, '')) LIKE '%deep%' THEN 'HIGH'
    WHEN category = 'water' AND LOWER(title || ' ' || COALESCE(description, '')) LIKE '%leak%' THEN 'HIGH'
    WHEN category = 'garbage' AND LOWER(title || ' ' || COALESCE(description, '')) LIKE '%overflowing%' THEN 'MEDIUM'
    WHEN LOWER(title || ' ' || COALESCE(description, '')) LIKE '%emergency%' OR LOWER(title || ' ' || COALESCE(description, '')) LIKE '%accident%' THEN 'CRITICAL'
    ELSE 'MEDIUM'
END
WHERE priority IS NULL;
