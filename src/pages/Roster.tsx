import React, { useState, useEffect } from 'react'
import { Calendar, Plus, Edit, Trash2, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface RosterEntry {
  id: string
  employee: string
  department: string
  shift: string
  startTime: string
  endTime: string
  date: string
}

export const Roster: React.FC = () => {
  const [rosterEntries, setRosterEntries] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchRosterEntries()
  }, [selectedWeek])

  const fetchRosterEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('roster')
        .select(`
          id,
          date,
          shift,
          start_time,
          end_time,
          employees (
            first_name,
            last_name,
            department
          )
        `)
        .eq('week_start', selectedWeek)

      if (error) throw error

      const formattedEntries = data?.map(entry => ({
        id: entry.id,
        employee: `${entry.employees.first_name} ${entry.employees.last_name}`,
        department: entry.employees.department,
        shift: entry.shift,
        startTime: entry.start_time,
        endTime: entry.end_time,
        date: entry.date
      })) || []

      setRosterEntries(formattedEntries)
    } catch (error) {
      console.error('Error fetching roster entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const shifts = [
    { name: 'Morning', time: '09:00 - 17:00', color: 'bg-blue-100 text-blue-800' },
    { name: 'Evening', time: '17:00 - 01:00', color: 'bg-purple-100 text-purple-800' },
    { name: 'Night', time: '01:00 - 09:00', color: 'bg-gray-100 text-gray-800' }
  ]

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
        <h1 className="text-2xl font-bold text-gray-900">Roster Management</h1>
        <div className="flex items-center space-x-2">
          <label htmlFor="week-select" className="text-sm text-gray-600">Select Week:</label>
          <input
            id="week-select"
            type="week"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button className="flex items-center space-x-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Add Shift</span>
          </button>
        </div>
      </div>

      {/* Shift Types */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Shift Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shifts.map((shift) => (
            <div
              key={shift.name}
              className="p-4 rounded-lg border border-gray-200"
            >
              <div className={`inline-block px-2 py-1 rounded-full ${shift.color} text-sm font-medium mb-2`}>
                {shift.name}
              </div>
              <div className="text-sm text-gray-600">{shift.time}</div>
            </div>
          ))}
          </div>
      </div>

      {/* Weekly Roster */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Weekly Schedule</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monday
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tuesday
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wednesday
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thursday
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Friday
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rosterEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{entry.employee}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{entry.department}</div>
                  </td>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                    <td key={day} className="px-6 py-4 whitespace-nowrap">
                      {entry.date === day && (
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium
                          ${shifts.find(s => s.name === entry.shift)?.color || 'bg-gray-100 text-gray-800'}`}>
                          {entry.shift}
                          <div className="text-xs text-gray-600">
                      {entry.startTime} - {entry.endTime}
                          </div>
                        </div>
                      )}
                  </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Template */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <Calendar className="w-6 h-6 text-pink-600 mb-2" />
            <div className="font-medium text-gray-900">Standard Week</div>
            <div className="text-sm text-gray-600">Mon-Fri, 9AM-5PM</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <Clock className="w-6 h-6 text-purple-600 mb-2" />
            <div className="font-medium text-gray-900">Shift Pattern</div>
            <div className="text-sm text-gray-600">Rotating shifts</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <Plus className="w-6 h-6 text-green-600 mb-2" />
            <div className="font-medium text-gray-900">Custom Schedule</div>
            <div className="text-sm text-gray-600">Create new template</div>
          </button>
        </div>
      </div>
    </div>
  )
}