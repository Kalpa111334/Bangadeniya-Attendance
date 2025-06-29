import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'

interface AttendanceData {
  name: string
  present: number
  absent: number
}

export const AttendanceChart: React.FC = () => {
  const [data, setData] = useState<AttendanceData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWeeklyAttendance()
  }, [])

  const fetchWeeklyAttendance = async () => {
    try {
      const today = new Date()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay()) // Get last Sunday
      
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('date, check_in')
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0])

      if (error) throw error

      // Process data into daily counts
      const dailyCounts = new Map<string, { present: number, total: number }>()
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      
      // Initialize all days
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + i)
        const dayName = days[date.getDay()]
        dailyCounts.set(dayName, { present: 0, total: 0 })
      }

      // Count attendance
      attendanceData?.forEach(record => {
        const date = new Date(record.date)
        const dayName = days[date.getDay()]
        const dayData = dailyCounts.get(dayName)
        if (dayData) {
          dayData.present += 1
          dayData.total += 1
        }
      })

      // Convert to chart data format
      const chartData = Array.from(dailyCounts.entries()).map(([name, counts]) => ({
        name,
        present: counts.present,
        absent: counts.total - counts.present
      }))

      setData(chartData)
    } catch (error) {
      console.error('Error fetching attendance data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Attendance Overview</h3>
        <div className="flex justify-center items-center h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Attendance Overview</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="present" fill="#3B82F6" name="Present" />
          <Bar dataKey="absent" fill="#EF4444" name="Absent" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}