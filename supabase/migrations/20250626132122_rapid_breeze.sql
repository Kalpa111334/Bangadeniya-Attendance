/*
  # Employee Attendance Management System Database Schema

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `created_at` (timestamp)
    
    - `employees`
      - `id` (uuid, primary key)
      - `first_name` (text, not null)
      - `last_name` (text, not null)
      - `contact_number` (text, unique)
      - `department_id` (uuid, foreign key)
      - `qr_code` (text, unique)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
    
    - `attendance_records`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key)
      - `date` (date)
      - `first_check_in` (timestamp)
      - `first_check_out` (timestamp)
      - `second_check_in` (timestamp)
      - `second_check_out` (timestamp)
      - `total_hours` (decimal)
      - `is_late` (boolean, default false)
      - `created_at` (timestamp)
    
    - `rosters`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key)
      - `date` (date)
      - `shift_start` (time)
      - `shift_end` (time)
      - `break_duration` (integer, minutes)
      - `created_at` (timestamp)
    
    - `settings`
      - `id` (uuid, primary key)
      - `key` (text, unique)
      - `value` (text)
      - `description` (text)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
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
  total_hours decimal(4,2) DEFAULT 0,
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

-- Create policies (allowing all authenticated users for admin dashboard)
CREATE POLICY "Enable all operations for authenticated users" ON departments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON employees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON attendance_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON rosters
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default department
INSERT INTO departments (name, description) VALUES 
  ('General', 'Default department for all employees')
ON CONFLICT (name) DO NOTHING;

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES 
  ('work_start_time', '09:00', 'Default work start time'),
  ('work_end_time', '17:00', 'Default work end time'),
  ('break_duration', '60', 'Default break duration in minutes'),
  ('late_threshold', '15', 'Late threshold in minutes'),
  ('notification_enabled', 'true', 'Enable push notifications')
ON CONFLICT (key) DO NOTHING;