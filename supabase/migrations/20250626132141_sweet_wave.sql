/*
  # Insert Initial Employee Data

  1. Employee Data
    - Insert the provided employee list
    - Generate QR codes for each employee
    - Assign to General department
*/

-- Insert initial employees with QR codes
INSERT INTO employees (first_name, last_name, contact_number, department_id, qr_code) 
SELECT 
  first_name,
  last_name,
  contact_number,
  (SELECT id FROM departments WHERE name = 'General' LIMIT 1),
  'EMP_' || UPPER(SUBSTR(MD5(RANDOM()::text), 1, 8)) as qr_code
FROM (
  VALUES 
    ('L', 'AMAL', '0741242758'),
    ('Samith', 'Chanaka', '0774538082'),
    ('H H', 'Chandrakumara', '0765640813'),
    ('Dimuthu', 'Chandana', '0776579733'),
    ('Sanjaya', 'Dahanuska', '074284448'),
    ('BMP', 'Kishantha', '0760987397'),
    ('Sahan', 'Wathsala', '0776118549'),
    ('T.M.D', 'Bandula', '0760987372'),
    ('Samith', 'Sanjeewa', '0770079290'),
    ('Ajith', 'Sirikumara', '0712979749'),
    ('H.M.', 'Jagath', '0740146674'),
    ('M.V', 'Thamindu', '071244381'),
    ('Tharindu', 'Fernando', '0711244381')
) AS employee_data(first_name, last_name, contact_number)
ON CONFLICT (contact_number) DO NOTHING;