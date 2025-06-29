import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Upload,
  Download,
  QrCode,
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  contact_number: string;
  department_id: string | null;
  qr_code: string;
  is_active: boolean;
  created_at: string;
  departments?: {
    name: string;
  };
}

interface Department {
  id: string;
  name: string;
  description: string | null;
}

export const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch employees',
        confirmButtonColor: '#3B82F6',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const generateQRCode = async (qrCodeData: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(qrCodeData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  const handleAddEmployee = async (formData: FormData) => {
    try {
      const firstName = formData.get('firstName') as string;
      const lastName = formData.get('lastName') as string;
      const contactNumber = formData.get('contactNumber') as string;
      const departmentId = formData.get('departmentId') as string;

      // Generate unique QR code
      const qrCode = `EMP_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const { error } = await supabase
        .from('employees')
        .insert({
          first_name: firstName,
          last_name: lastName,
          contact_number: contactNumber,
          department_id: departmentId || null,
          qr_code: qrCode,
        });

      if (error) throw error;

      await fetchEmployees();
      setShowAddModal(false);

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Employee added successfully',
        confirmButtonColor: '#3B82F6',
      });
    } catch (error: any) {
      console.error('Error adding employee:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add employee',
        confirmButtonColor: '#3B82F6',
      });
    }
  };

  const handleUpdateEmployee = async (formData: FormData) => {
    if (!editingEmployee) return;

    try {
      const firstName = formData.get('firstName') as string;
      const lastName = formData.get('lastName') as string;
      const contactNumber = formData.get('contactNumber') as string;
      const departmentId = formData.get('departmentId') as string;

      const { error } = await supabase
        .from('employees')
        .update({
          first_name: firstName,
          last_name: lastName,
          contact_number: contactNumber,
          department_id: departmentId || null,
        })
        .eq('id', editingEmployee.id);

      if (error) throw error;

      await fetchEmployees();
      setEditingEmployee(null);

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Employee updated successfully',
        confirmButtonColor: '#3B82F6',
      });
    } catch (error: any) {
      console.error('Error updating employee:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update employee',
        confirmButtonColor: '#3B82F6',
      });
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete ${employee.first_name} ${employee.last_name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete',
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('employees')
          .update({ is_active: false })
          .eq('id', employee.id);

        if (error) throw error;

        await fetchEmployees();

        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Employee has been deactivated',
          confirmButtonColor: '#3B82F6',
        });
      } catch (error) {
        console.error('Error deleting employee:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete employee',
          confirmButtonColor: '#3B82F6',
        });
      }
    }
  };

  const handleShowQRCode = async (employee: Employee) => {
    const qrCodeDataURL = await generateQRCode(employee.qr_code);
    
    Swal.fire({
      title: `${employee.first_name} ${employee.last_name}`,
      html: `
        <div class="text-center">
          <img src="${qrCodeDataURL}" alt="QR Code" class="mx-auto mb-4" />
          <p class="text-gray-600">QR Code: ${employee.qr_code}</p>
        </div>
      `,
      width: 400,
      confirmButtonColor: '#3B82F6',
      confirmButtonText: 'Download QR Code',
    }).then((result) => {
      if (result.isConfirmed) {
        const link = document.createElement('a');
        link.download = `${employee.first_name}_${employee.last_name}_QR.png`;
        link.href = qrCodeDataURL;
        link.click();
      }
    });
  };

  const handleBulkUpload = () => {
    Swal.fire({
      title: 'Upload Employee Data',
      html: `
        <div class="text-left">
          <p class="mb-4">Upload a CSV or Excel file with the following columns:</p>
          <ul class="list-disc list-inside mb-4 text-sm">
            <li>FirstName</li>
            <li>LastName</li>
            <li>ContactNumber</li>
          </ul>
          <input type="file" id="fileInput" accept=".csv,.xlsx,.xls" class="w-full p-2 border rounded" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Upload',
      confirmButtonColor: '#3B82F6',
      preConfirm: () => {
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        return fileInput.files?.[0];
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        await processBulkUpload(result.value);
      }
    });
  };

  const processBulkUpload = async (file: File) => {
    try {
      let data: any[] = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const text = await file.text();
        const result = Papa.parse(text, { header: true });
        data = result.data;
      } else {
        // Parse Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(worksheet);
      }

      // Validate and process data
      const employees = data
        .filter(row => row.FirstName && row.LastName && row.ContactNumber)
        .map(row => ({
          first_name: row.FirstName.trim(),
          last_name: row.LastName.trim(),
          contact_number: row.ContactNumber.toString().trim(),
          department_id: departments.find(d => d.name === 'General')?.id || null,
          qr_code: `EMP_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        }));

      if (employees.length === 0) {
        throw new Error('No valid employee data found');
      }

      // Insert employees
      const { error } = await supabase
        .from('employees')
        .insert(employees);

      if (error) throw error;

      await fetchEmployees();

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `${employees.length} employees added successfully`,
        confirmButtonColor: '#3B82F6',
      });
    } catch (error: any) {
      console.error('Error processing bulk upload:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to process file',
        confirmButtonColor: '#3B82F6',
      });
    }
  };

  const exportEmployees = () => {
    const exportData = employees.map(emp => ({
      'First Name': emp.first_name,
      'Last Name': emp.last_name,
      'Contact Number': emp.contact_number,
      'Department': emp.departments?.name || 'N/A',
      'QR Code': emp.qr_code,
      'Status': emp.is_active ? 'Active' : 'Inactive',
      'Created': new Date(emp.created_at).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'employees.xlsx');
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.contact_number.includes(searchTerm);
    
    const matchesDepartment = 
      !selectedDepartment || emp.department_id === selectedDepartment;

    return matchesSearch && matchesDepartment && emp.is_active;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 pb-20 sm:pb-6">
      <div className="container-responsive py-responsive">
        {/* Header */}
        <div className="flex flex-col space-y-4 mb-responsive">
          <div>
            <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">
              Employee Management
            </h1>
            <p className="text-responsive-sm text-gray-600">
              Manage employee records and generate QR codes
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-success"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="hidden sm:inline">Add Employee</span>
              <span className="sm:hidden">Add</span>
            </button>
            <button
              onClick={handleBulkUpload}
              className="btn-primary"
            >
              <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="hidden sm:inline">Bulk Upload</span>
              <span className="sm:hidden">Upload</span>
            </button>
            <button
              onClick={exportEmployees}
              className="btn-secondary"
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-responsive">
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  title="Search employees"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="input-field pl-10 appearance-none"
                  title="Filter by department"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center text-responsive-sm text-gray-600">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                {filteredEmployees.length} employees found
              </div>
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="card">
          <div className="table-responsive">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Contact
                  </th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Department
                  </th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    QR Code
                  </th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-600 font-medium text-xs sm:text-sm">
                            {employee.first_name[0]}{employee.last_name[0]}
                          </span>
                        </div>
                        <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                          <div className="text-responsive-sm font-medium text-gray-900 truncate">
                            {employee.first_name} {employee.last_name}
                          </div>
                          <div className="text-responsive-xs text-gray-500 sm:hidden">
                            {employee.contact_number}
                          </div>
                          <div className="text-responsive-xs text-gray-500 lg:hidden">
                            {employee.departments?.name || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-responsive-sm text-gray-900 hidden sm:table-cell">
                      {employee.contact_number}
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-responsive-sm text-gray-900 hidden lg:table-cell">
                      {employee.departments?.name || 'N/A'}
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                      <span className="text-xs font-mono text-gray-600">
                        {employee.qr_code}
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-responsive-sm font-medium">
                      <div className="flex space-x-1 sm:space-x-2">
                        <button
                          onClick={() => handleShowQRCode(employee)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Show QR Code"
                        >
                          <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                        <button
                          onClick={() => setEditingEmployee(employee)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(employee)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-responsive-sm text-gray-500">No employees found</p>
            </div>
          )}
        </div>

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="modal-content">
              <div className="p-4 sm:p-6">
                <h3 className="text-responsive-lg font-semibold text-gray-900 mb-4">Add New Employee</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleAddEmployee(new FormData(e.currentTarget));
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-responsive-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        required
                        className="input-field"
                        placeholder="Enter first name"
                        title="Employee first name"
                      />
                    </div>
                    <div>
                      <label className="block text-responsive-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        required
                        className="input-field"
                        placeholder="Enter last name"
                        title="Employee last name"
                      />
                    </div>
                    <div>
                      <label className="block text-responsive-sm font-medium text-gray-700 mb-1">
                        Contact Number
                      </label>
                      <input
                        type="text"
                        name="contactNumber"
                        required
                        className="input-field"
                        placeholder="Enter contact number"
                        title="Employee contact number"
                      />
                    </div>
                    <div>
                      <label className="block text-responsive-sm font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <select
                        name="departmentId"
                        className="input-field"
                        title="Select department"
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="btn-secondary order-2 sm:order-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-success order-1 sm:order-2"
                    >
                      Add Employee
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Employee Modal */}
        {editingEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="modal-content">
              <div className="p-4 sm:p-6">
                <h3 className="text-responsive-lg font-semibold text-gray-900 mb-4">Edit Employee</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateEmployee(new FormData(e.currentTarget));
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-responsive-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        defaultValue={editingEmployee.first_name}
                        required
                        className="input-field"
                        placeholder="Enter first name"
                        title="Employee first name"
                      />
                    </div>
                    <div>
                      <label className="block text-responsive-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        defaultValue={editingEmployee.last_name}
                        required
                        className="input-field"
                        placeholder="Enter last name"
                        title="Employee last name"
                      />
                    </div>
                    <div>
                      <label className="block text-responsive-sm font-medium text-gray-700 mb-1">
                        Contact Number
                      </label>
                      <input
                        type="text"
                        name="contactNumber"
                        defaultValue={editingEmployee.contact_number}
                        required
                        className="input-field"
                        placeholder="Enter contact number"
                        title="Employee contact number"
                      />
                    </div>
                    <div>
                      <label className="block text-responsive-sm font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <select
                        name="departmentId"
                        defaultValue={editingEmployee.department_id || ''}
                        className="input-field"
                        title="Select department"
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setEditingEmployee(null)}
                      className="btn-secondary order-2 sm:order-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-success order-1 sm:order-2"
                    >
                      Update Employee
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};