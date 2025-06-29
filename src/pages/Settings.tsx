import React, { useState, useEffect } from 'react'
import { Save, Bell, Clock, Users, Shield, Database } from 'lucide-react'
import { showSuccessAlert } from '../utils/notifications'
import { supabase } from '../lib/supabase'

interface SystemSettings {
  workingHours: {
    start: string
    end: string
  }
  lateThreshold: number
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
  }
  attendance: {
    autoCheckOut: boolean
    requirePhoto: boolean
    allowManualEntry: boolean
  }
}

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    lateThreshold: 15,
    notifications: {
      email: true,
      sms: true,
      push: true
    },
    attendance: {
      autoCheckOut: true,
      requirePhoto: false,
      allowManualEntry: false
    }
  })
  const [loading, setLoading] = useState(true)
  const [systemInfo, setSystemInfo] = useState({
    version: '1.0.0',
    dbStatus: 'Connected',
    lastBackup: 'Loading...',
    activeUsers: 0
  })

  useEffect(() => {
    fetchSettings()
    fetchSystemInfo()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single()

      if (error) throw error

      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSystemInfo = async () => {
    try {
      // Get active users count
      const { data: activeUsers, error: usersError } = await supabase
        .from('employees')
        .select('id', { count: 'exact' })
        .eq('is_active', true)

      if (usersError) throw usersError

      // Get last backup time (this would be implementation specific)
      const lastBackup = new Date()
      lastBackup.setHours(lastBackup.getHours() - 2)

      setSystemInfo({
        version: '1.0.0', // This would typically come from your app's version management
        dbStatus: 'Connected',
        lastBackup: lastBackup.toLocaleString(),
        activeUsers: activeUsers?.length || 0
      })
    } catch (error) {
      console.error('Error fetching system info:', error)
    }
  }

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert(settings)

      if (error) throw error

    showSuccessAlert('Settings Saved', 'Your settings have been updated successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
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
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </button>
      </div>

      {/* Working Hours */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Clock className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Working Hours</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              id="start-time"
              type="time"
              value={settings.workingHours.start}
              onChange={(e) => setSettings({
                ...settings,
                workingHours: { ...settings.workingHours, start: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              id="end-time"
              type="time"
              value={settings.workingHours.end}
              onChange={(e) => setSettings({
                ...settings,
                workingHours: { ...settings.workingHours, end: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label htmlFor="late-threshold" className="block text-sm font-medium text-gray-700 mb-1">
            Late Arrival Threshold (minutes)
          </label>
          <input
            id="late-threshold"
            type="number"
            min="0"
            max="60"
            value={settings.lateThreshold}
            onChange={(e) => setSettings({
              ...settings,
              lateThreshold: parseInt(e.target.value)
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Bell className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Email Notifications</div>
              <div className="text-sm text-gray-600">Receive updates via email</div>
            </div>
            <input
              type="checkbox"
              title="Enable email notifications"
              checked={settings.notifications.email}
              onChange={(e) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, email: e.target.checked }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">SMS Notifications</div>
              <div className="text-sm text-gray-600">Receive updates via SMS</div>
            </div>
            <input
              type="checkbox"
              title="Enable SMS notifications"
              checked={settings.notifications.sms}
              onChange={(e) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, sms: e.target.checked }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Push Notifications</div>
              <div className="text-sm text-gray-600">Receive push notifications</div>
            </div>
            <input
              type="checkbox"
              title="Enable push notifications"
              checked={settings.notifications.push}
              onChange={(e) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, push: e.target.checked }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Attendance Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Users className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Attendance Settings</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Auto Check-out</div>
              <div className="text-sm text-gray-600">Automatically check out at end of shift</div>
            </div>
            <input
              type="checkbox"
              title="Enable automatic check-out"
              checked={settings.attendance.autoCheckOut}
              onChange={(e) => setSettings({
                ...settings,
                attendance: { ...settings.attendance, autoCheckOut: e.target.checked }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Require Photo</div>
              <div className="text-sm text-gray-600">Require photo for check-in/out</div>
            </div>
            <input
              type="checkbox"
              title="Require photo for attendance"
              checked={settings.attendance.requirePhoto}
              onChange={(e) => setSettings({
                ...settings,
                attendance: { ...settings.attendance, requirePhoto: e.target.checked }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Allow Manual Entry</div>
              <div className="text-sm text-gray-600">Allow administrators to manually enter attendance</div>
            </div>
            <input
              type="checkbox"
              title="Allow manual attendance entry"
              checked={settings.attendance.allowManualEntry}
              onChange={(e) => setSettings({
                ...settings,
                attendance: { ...settings.attendance, allowManualEntry: e.target.checked }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="w-6 h-6 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Version</div>
            <div className="text-lg font-semibold text-gray-900">{systemInfo.version}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Database Status</div>
            <div className="text-lg font-semibold text-green-600">{systemInfo.dbStatus}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Last Backup</div>
            <div className="text-lg font-semibold text-gray-900">{systemInfo.lastBackup}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Active Users</div>
            <div className="text-lg font-semibold text-blue-600">{systemInfo.activeUsers}</div>
          </div>
        </div>
      </div>
    </div>
  )
}