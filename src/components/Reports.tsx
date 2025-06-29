import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  Users,
  Clock,
  TrendingUp,
  Building2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  first_check_in: string | null;
  first_check_out: string | null;
  second_check_in: string | null;
  second_check_out: string | null;
  total_hours: number;
  is_late: boolean;
  late_duration: number;
  break_duration: number;
  employees: {
    first_name: string;
    last_name: string;
    departments?: {
      name: string;
    };
  };
}

interface ReportData {
  records: AttendanceRecord[];
  summary: {
    totalEmployees: number;
    totalWorkingDays: number;
    totalHours: number;
    averageHours: number;
    lateCount: number;
    absentCount: number;
    presentCount: number;
    halfDayCount: number;
  };
}

export const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      generateReport();
    }
  }, [reportType, selectedDate, selectedDepartment]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const getDateRange = () => {
    const date = new Date(selectedDate);
    
    switch (reportType) {
      case 'weekly':
        return {
          start: format(startOfWeek(date), 'yyyy-MM-dd'),
          end: format(endOfWeek(date), 'yyyy-MM-dd')
        };
      case 'monthly':
        return {
          start: format(startOfMonth(date), 'yyyy-MM-dd'),
          end: format(endOfMonth(date), 'yyyy-MM-dd')
        };
      default:
        return {
          start: selectedDate,
          end: selectedDate
        };
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      // Build query
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          employees!inner(
            first_name,
            last_name,
            departments(name)
          )
        `)
        .gte('date', start)
        .lte('date', end);

      // Add department filter if selected
      if (selectedDepartment) {
        query = query.eq('employees.department_id', selectedDepartment);
      }

      const { data: attendanceData, error } = await query;

      if (error) throw error;

      // Process data
      const records = attendanceData || [];
      const uniqueEmployees = new Set(records.map(r => r.employee_id));
      const totalHours = records.reduce((sum, record) => sum + (record.total_hours || 0), 0);
      const lateCount = records.filter(r => r.is_late).length;
      const presentCount = records.length;
      const halfDayCount = records.filter(r => (r.total_hours || 0) >= 4 && (r.total_hours || 0) < 8).length;

      const summary = {
        totalEmployees: uniqueEmployees.size,
        totalWorkingDays: records.length,
        totalHours,
        averageHours: records.length > 0 ? totalHours / records.length : 0,
        lateCount,
        absentCount: 0, // Would need to calculate based on expected vs actual attendance
        presentCount,
        halfDayCount
      };

      setReportData({ records, summary });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '-';
    return format(new Date(timeString), 'h:mm a');
  };

  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return '0:00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const calculateWorkingDuration = (record: AttendanceRecord): string => {
    if (!record.first_check_in) return '0:00';
    
    let totalMinutes = 0;
    
    // First session
    if (record.first_check_in && record.first_check_out) {
      const firstIn = new Date(record.first_check_in);
      const firstOut = new Date(record.first_check_out);
      totalMinutes += (firstOut.getTime() - firstIn.getTime()) / (1000 * 60);
    }
    
    // Second session
    if (record.second_check_in && record.second_check_out) {
      const secondIn = new Date(record.second_check_in);
      const secondOut = new Date(record.second_check_out);
      totalMinutes += (secondOut.getTime() - secondIn.getTime()) / (1000 * 60);
    }
    
    return formatDuration(Math.round(totalMinutes));
  };

  const getAttendanceStatus = (record: AttendanceRecord): string => {
    if (!record.first_check_in) return 'Absent';
    if (record.is_late) return 'Late';
    if ((record.total_hours || 0) >= 4 && (record.total_hours || 0) < 8) return 'Half-Day';
    return 'Present';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-800';
      case 'Late': return 'bg-orange-100 text-orange-800';
      case 'Half-Day': return 'bg-yellow-100 text-yellow-800';
      case 'Absent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const downloadPDF = async () => {
    if (!reportData) return;

    const reportElement = document.getElementById('report-content');
    if (!reportElement) return;

    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation for better table fit
      
      const imgWidth = 297; // A4 landscape width
      const pageHeight = 210; // A4 landscape height
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `attendance-report-${reportType}-${selectedDate}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const getReportTitle = () => {
    const date = new Date(selectedDate);
    switch (reportType) {
      case 'weekly':
        return `Weekly Report - ${format(startOfWeek(date), 'MMM dd')} to ${format(endOfWeek(date), 'MMM dd, yyyy')}`;
      case 'monthly':
        return `Monthly Report - ${format(date, 'MMMM yyyy')}`;
      default:
        return `Daily Report - ${format(date, 'dd/MM/yyyy')}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Attendance Reports
            </h1>
            <p className="text-gray-600">
              Comprehensive attendance tracking with detailed analysis
            </p>
          </div>
          <button
            onClick={downloadPDF}
            disabled={!reportData || loading}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mt-4 md:mt-0"
          >
            <Download className="h-5 w-5 mr-2" />
            Download PDF
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {reportData && (
          <div id="report-content" className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Report Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
              <h2 className="text-2xl font-bold mb-2">{getReportTitle()}</h2>
              <p className="text-purple-100">
                Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')} | Working Hours: 7:30 AM - 4:30 PM
              </p>
            </div>

            {/* Summary Cards */}
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">{reportData.summary.totalEmployees}</p>
                  <p className="text-sm text-blue-600">Employees</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{reportData.summary.presentCount}</p>
                  <p className="text-sm text-green-600">Present</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <AlertCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-600">{reportData.summary.lateCount}</p>
                  <p className="text-sm text-orange-600">Late</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-600">{reportData.summary.halfDayCount}</p>
                  <p className="text-sm text-yellow-600">Half-Day</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <Building2 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">{reportData.summary.totalHours.toFixed(1)}</p>
                  <p className="text-sm text-purple-600">Total Hours</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <FileText className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-indigo-600">{reportData.summary.averageHours.toFixed(1)}</p>
                  <p className="text-sm text-indigo-600">Avg Hours</p>
                </div>
              </div>

              {/* Detailed Attendance Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        First Check-In
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        First Check-Out
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Second Check-In
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Second Check-Out
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Break Duration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Working Duration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Late Duration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Late Minutes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.records.map((record) => {
                      const status = getAttendanceStatus(record);
                      return (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(record.date), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {record.employees.first_name} {record.employees.last_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {record.employees.departments?.name || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(record.first_check_in)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(record.first_check_out)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(record.second_check_in)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(record.second_check_out)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDuration(record.break_duration || 60)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {calculateWorkingDuration(record)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {record.is_late ? formatDuration(record.late_duration || 0) : '0:00'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {record.late_duration || 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {reportData.records.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No attendance data found for the selected period</p>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
          </div>
        )}
      </div>
    </div>
  );
};