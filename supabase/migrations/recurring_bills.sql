-- Create recurring_bills table for the Bill Tracker.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS recurring_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  day_of_month smallint NOT NULL DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 31)
);

-- Optional: allow the anon role to read (adjust if you use RLS differently)
ALTER TABLE recurring_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read recurring_bills" ON recurring_bills;
CREATE POLICY "Allow anon read recurring_bills"
  ON recurring_bills FOR SELECT
  TO anon
  USING (true);

-- Example rows (uncomment to insert):
-- INSERT INTO recurring_bills (name, amount, day_of_month) VALUES
--   ('Rent', 1200, 1),
--   ('Electric', 85, 15),
--   ('Internet', 60, 20);
