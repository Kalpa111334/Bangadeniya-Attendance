import React, { useState, useEffect } from 'react'
import { Download, Calendar, FileText, BarChart3, Users } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { supabase } from '../lib/supabase'

interface AttendanceRecord {
  employee_name: string
  department: string
  check_in: string
  check_out: string
  hours: number
  status: string
}

export const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState('daily')
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<AttendanceRecord[]>([])

  const reportTypes = [
    { id: 'daily', name: 'Daily Report', icon: Calendar, color: 'bg-blue-500' },
    { id: 'weekly', name: 'Weekly Report', icon: BarChart3, color: 'bg-green-500' },
    { id: 'monthly', name: 'Monthly Report', icon: FileText, color: 'bg-purple-500' },
    { id: 'employee', name: 'Employee Report', icon: Users, color: 'bg-orange-500' }
  ]

  useEffect(() => {
    fetchReportData()
  }, [selectedReport, dateRange])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          date,
          check_in,
          check_out,
          is_late,
          employees (
            first_name,
            last_name,
            department
          )
        `)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)

      if (error) throw error

      const formattedData = data.map(record => {
        const checkIn = new Date(record.check_in)
        const checkOut = record.check_out ? new Date(record.check_out) : null
        const hours = checkOut ? (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60) : null

        return {
          employee_name: `${record.employees.first_name} ${record.employees.last_name}`,
          department: record.employees.department,
          check_in: checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          check_out: checkOut ? checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
          hours: hours ? Number(hours.toFixed(1)) : null,
          status: record.is_late ? 'Late' : 'Present'
        }
      })

      setReportData(formattedData)
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = () => {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(20)
    doc.text('Attendance Report', 20, 20)
    
    // Add date range
    doc.setFontSize(12)
    doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 20, 35)
    
    // Convert data for table
    const tableData = reportData.map(record => [
      record.employee_name,
      record.department,
      record.check_in,
      record.check_out,
      record.hours ? `${record.hours}h` : '-',
      record.status
    ])
    
    // Add table
    const columns = ['Employee', 'Department', 'Check In', 'Check Out', 'Hours', 'Status']
    
    // @ts-ignore - autoTable plugin types
    doc.autoTable({
      head: [columns],
      body: tableData,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    })
    
    // Save the PDF
    doc.save(`attendance-report-${selectedReport}-${Date.now()}.pdf`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <button
          onClick={generateReport}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Generate Report</span>
        </button>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportTypes.map((type) => {
          const Icon = type.icon
          return (
            <button
              key={type.id}
              onClick={() => setSelectedReport(type.id)}
              title={type.name}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedReport === type.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 ${type.color} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">{type.name}</h3>
            </button>
          )
        })}
      </div>

      {/* Date Range Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Range</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              id="start-date"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              id="end-date"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Preview</h3>
        
        {/* Sample Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {reportData.length}
            </div>
            <div className="text-sm text-blue-800">Total Records</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {new Set(reportData.map(r => r.employee_name)).size}
            </div>
            <div className="text-sm text-green-800">Unique Employees</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {reportData.filter(r => r.status === 'Late').length}
            </div>
            <div className="text-sm text-orange-800">Late Arrivals</div>
          </div>
        </div>

        {/* Sample Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.slice(0, 10).map((record, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-900">{record.employee_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{record.department}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{record.check_in}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{record.check_out}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{record.hours ? `${record.hours}h` : '-'}</td>
                <td className="px-4 py-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      record.status === 'Late' 
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {record.status}
                  </span>
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={generateReport}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5 text-red-600" />
            <span>Export as PDF</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-5 h-5 text-green-600" />
            <span>Export as Excel</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Send via Email</span>
          </button>
        </div>
      </div>
    </div>
  )
}