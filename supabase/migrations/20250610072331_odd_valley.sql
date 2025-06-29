/*
  # Employee Attendance Management System Schema

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
    
    - `employees`
      - `id` (text, primary key) - custom employee ID
      - `first_name` (text)
      - `last_name` (text)
      - `contact_number` (text)
      - `department` (text)
      - `qr_code` (text) - base64 QR code data
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `attendance`
      - `id` (uuid, primary key)
      - `employee_id` (text, foreign key)
      - `check_in` (timestamp)
      - `check_out` (timestamp, nullable)
      - `date` (date)
      - `working_hours` (decimal, nullable)
      - `is_late` (boolean, default false)
      - `created_at` (timestamp)
    
    - `leave_requests`
      - `id` (uuid, primary key)
      - `employee_id` (text, foreign key)
      - `start_date` (date)
      - `end_date` (date)
      - `reason` (text)
      - `status` (text, default 'pending')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (admin dashboard)
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id text PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  contact_number text NOT NULL,
  department text NOT NULL,
  qr_code text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  check_in timestamptz NOT NULL,
  check_out timestamptz,
  date date NOT NULL,
  working_hours decimal(4,2),
  is_late boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (admin dashboard)
CREATE POLICY "Public access for departments" ON departments FOR ALL USING (true);
CREATE POLICY "Public access for employees" ON employees FOR ALL USING (true);
CREATE POLICY "Public access for attendance" ON attendance FOR ALL USING (true);
CREATE POLICY "Public access for leave_requests" ON leave_requests FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);

-- Insert sample departments
INSERT INTO departments (name) VALUES 
  ('IT'),
  ('HR'),
  ('Finance'),
  ('Operations'),
  ('Marketing')
ON CONFLICT (name) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for employees table
CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();