/*
  # Complete Attendance System Database Schema

  1. New Tables
    - `departments` - Store department information
    - `employees` - Store employee records with QR codes
    - `attendance_records` - Track daily attendance with multiple check-ins/outs
    - `rosters` - Schedule employee shifts
    - `settings` - Store application configuration

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to perform all operations

  3. Relationships
    - employees.department_id -> departments.id
    - attendance_records.employee_id -> employees.id
    - rosters.employee_id -> employees.id

  4. Indexes
    - Unique constraints on employee contact numbers and QR codes
    - Composite unique indexes for attendance and roster records
    - Performance indexes on frequently queried columns
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  contact_number text UNIQUE NOT NULL,
  department_id uuid REFERENCES departments(id),
  qr_code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  date date NOT NULL,
  first_check_in timestamptz,
  first_check_out timestamptz,
  second_check_in timestamptz,
  second_check_out timestamptz,
  total_hours numeric(4,2) DEFAULT 0,
  is_late boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Create rosters table
CREATE TABLE IF NOT EXISTS rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  date date NOT NULL,
  shift_start time NOT NULL,
  shift_end time NOT NULL,
  break_duration integer DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for departments
CREATE POLICY "Enable all operations for authenticated users on departments"
  ON departments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for employees
CREATE POLICY "Enable all operations for authenticated users on employees"
  ON employees
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for attendance_records
CREATE POLICY "Enable all operations for authenticated users on attendance_records"
  ON attendance_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for rosters
CREATE POLICY "Enable all operations for authenticated users on rosters"
  ON rosters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for settings
CREATE POLICY "Enable all operations for authenticated users on settings"
  ON settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default departments
INSERT INTO departments (name, description) VALUES
  ('General', 'General department for employees without specific department assignment'),
  ('Administration', 'Administrative staff and management'),
  ('Operations', 'Operational staff and field workers'),
  ('IT', 'Information Technology department'),
  ('HR', 'Human Resources department')
ON CONFLICT (name) DO NOTHING;

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
  ('work_start_time', '09:00', 'Default work start time for late arrival calculation'),
  ('work_end_time', '17:00', 'Default work end time'),
  ('break_duration', '60', 'Default break duration in minutes'),
  ('late_threshold', '15', 'Minutes after work start time to consider as late'),
  ('company_name', 'Your Company', 'Company name for reports and notifications')
ON CONFLICT (key) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_id ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_rosters_employee_id ON rosters(employee_id);
CREATE INDEX IF NOT EXISTS idx_rosters_date ON rosters(date);