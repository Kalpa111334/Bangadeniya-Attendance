import React, { useEffect, useState } from 'react'
import { Users, Clock, TrendingUp, AlertTriangle } from 'lucide-react'
import { StatsCard } from '../components/Dashboard/StatsCard'
import { AttendanceChart } from '../components/Dashboard/AttendanceChart'
import { RecentActivity } from '../components/Dashboard/RecentActivity'
import { supabase } from '../lib/supabase'

interface DashboardStats {
  totalEmployees: number
  presentToday: number
  lateArrivals: number
  attendanceRate: number
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    lateArrivals: 0,
    attendanceRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get total employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id', { count: 'exact' })

      if (employeesError) throw employeesError

      // Get today's attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, is_late')
        .eq('date', today)

      if (attendanceError) throw attendanceError

      const totalEmployees = employeesData?.length || 0
      const presentToday = attendanceData?.length || 0
      const lateArrivals = attendanceData?.filter(record => record.is_late)?.length || 0
      const attendanceRate = totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0

      setStats({
        totalEmployees,
        presentToday,
        lateArrivals,
        attendanceRate
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <div className="text-sm text-gray-600">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Employees"
          value={stats.totalEmployees.toString()}
          icon={Users}
          color="bg-blue-500"
          trend={undefined}
        />
        <StatsCard
          title="Present Today"
          value={stats.presentToday.toString()}
          icon={Clock}
          color="bg-green-500"
          trend={undefined}
        />
        <StatsCard
          title="Late Arrivals"
          value={stats.lateArrivals.toString()}
          icon={AlertTriangle}
          color="bg-orange-500"
          trend={undefined}
        />
        <StatsCard
          title="Attendance Rate"
          value={`${Math.round(stats.attendanceRate)}%`}
          icon={TrendingUp}
          color="bg-purple-500"
          trend={undefined}
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AttendanceChart />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <Clock className="w-6 h-6 text-blue-600 mb-2" />
            <div className="font-medium text-gray-900">Generate Report</div>
            <div className="text-sm text-gray-600">Export attendance data</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <Users className="w-6 h-6 text-green-600 mb-2" />
            <div className="font-medium text-gray-900">Add Employee</div>
            <div className="text-sm text-gray-600">Register new employee</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
            <div className="font-medium text-gray-900">View Analytics</div>
            <div className="text-sm text-gray-600">Detailed insights</div>
          </button>
        </div>
      </div>
    </div>
  )
}