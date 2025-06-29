/*
  # Update Attendance System Configuration

  1. Updates
    - Add late_duration and break_duration columns to attendance_records
    - Update default settings for 7:30 AM - 4:30 PM working hours
    - Add grace period setting
    - Add indexes for performance

  2. New Features
    - Enhanced attendance tracking with break duration
    - Late duration calculation
    - Improved status tracking
*/

-- Add missing columns to attendance_records if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_records' AND column_name = 'late_duration'
  ) THEN
    ALTER TABLE attendance_records ADD COLUMN late_duration integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_records' AND column_name = 'break_duration'
  ) THEN
    ALTER TABLE attendance_records ADD COLUMN break_duration integer DEFAULT 60;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_late_duration ON attendance_records(late_duration);
CREATE INDEX IF NOT EXISTS idx_attendance_records_break_duration ON attendance_records(break_duration);

-- Update default settings for new working hours
INSERT INTO settings (key, value, description) VALUES
  ('work_start_time', '07:30', 'Work start time (7:30 AM)'),
  ('work_end_time', '16:30', 'Work end time (4:30 PM)'),
  ('grace_period', '15', 'Grace period for late arrivals in minutes'),
  ('half_day_threshold', '4', 'Minimum hours for half-day attendance')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();