import React, { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Activity {
  id: string
  employee_name: string
  action: string
  time: string
  status: string
  avatar: string
  }

export const RecentActivity: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivity()
  }, [])

  const fetchRecentActivity = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          check_in,
          check_out,
          is_late,
          employees (
            first_name,
            last_name
          )
        `)
        .eq('date', today)
        .order('check_in', { ascending: false })
        .limit(4)

      if (error) throw error

      const formattedActivities = data.map(record => {
        const firstName = record.employees.first_name
        const lastName = record.employees.last_name
        const action = record.check_out ? 'Check Out' : 'Check In'
        const time = new Date(record.check_out || record.check_in)
          .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        
        let status = 'on-time'
        if (record.is_late) status = 'late'
        else if (time.includes('08:')) status = 'early'

        return {
          id: record.id,
          employee_name: `${firstName} ${lastName}`,
          action,
          time,
          status,
          avatar: `${firstName[0]}${lastName[0]}`
        }
      })

      setActivities(formattedActivities)
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="flex justify-center items-center h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {activity.avatar}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{activity.employee_name}</p>
              <p className="text-xs text-gray-500">{activity.action}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{activity.time}</span>
              {activity.status === 'on-time' && <CheckCircle className="w-4 h-4 text-green-500" />}
              {activity.status === 'late' && <XCircle className="w-4 h-4 text-red-500" />}
              {activity.status === 'early' && <Clock className="w-4 h-4 text-blue-500" />}
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  )
}