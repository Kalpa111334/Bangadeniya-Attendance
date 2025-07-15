import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Clock, 
  Bell, 
  Save, 
  AlertCircle,
  Smartphone,
  Volume2,
  Timer
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';
import { notificationService } from '../lib/notifications';
import { voiceService } from '../lib/voice';
import { NotificationSettings } from './NotificationSettings';

interface SettingsData {
  work_start_time: string;
  work_end_time: string;
  break_duration: string;
  late_threshold: string;
  grace_period: string;
  half_day_threshold: string;
  notification_enabled: string;
}

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    work_start_time: '07:30',
    work_end_time: '16:30',
    break_duration: '60',
    late_threshold: '15',
    grace_period: '15',
    half_day_threshold: '4',
    notification_enabled: 'true',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'default'>('default');
  const [voiceTestPlaying, setVoiceTestPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'notifications'>('general');

  useEffect(() => {
    fetchSettings();
    checkNotificationStatus();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap: { [key: string]: string } = {};
      data?.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });

      setSettings(prev => ({
        ...prev,
        ...settingsMap,
      }));
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNotificationStatus = () => {
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate working hours
      const startTime = new Date(`2000-01-01T${settings.work_start_time}`);
      const endTime = new Date(`2000-01-01T${settings.work_end_time}`);
      
      if (startTime >= endTime) {
        throw new Error('Work end time must be after work start time');
      }

      // Update each setting
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert(update, { onConflict: 'key' });

        if (error) throw error;
      }

      Swal.fire({
        icon: 'success',
        title: 'Settings Saved',
        text: 'All settings have been updated successfully',
        confirmButtonColor: '#10B981',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to save settings',
        confirmButtonColor: '#EF4444',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const success = await notificationService.initialize();
      if (success) {
        setNotificationStatus('granted');
        setSettings(prev => ({ ...prev, notification_enabled: 'true' }));
        
        // Test notification
        await notificationService.sendNotification('Notifications Enabled', {
          body: 'You will now receive attendance notifications',
          icon: '/icon-192x192.png',
        });
      } else {
        setNotificationStatus('denied');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    }
  };

  const testVoiceFeedback = async () => {
    setVoiceTestPlaying(true);
    try {
      voiceService.announceAttendance('John Doe', 'first_check_in', new Date().toISOString());
      setTimeout(() => setVoiceTestPlaying(false), 3000);
    } catch (error) {
      console.error('Error testing voice feedback:', error);
      setVoiceTestPlaying(false);
    }
  };

  const handleInputChange = (key: keyof SettingsData, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const calculateWorkingHours = () => {
    try {
      const startTime = new Date(`2000-01-01T${settings.work_start_time}`);
      const endTime = new Date(`2000-01-01T${settings.work_end_time}`);
      const breakMinutes = parseInt(settings.break_duration) || 0;
      
      const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60) - breakMinutes;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    } catch {
      return '0:00';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 pb-20 sm:pb-6">
      <div className="container-responsive py-responsive">
        {/* Header */}
        <div className="mb-responsive">
          <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">
            System Settings
          </h1>
          <p className="text-responsive-sm text-gray-600">
            Configure attendance system preferences and notifications
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                title="General Settings"
                aria-label="General Settings"
              >
                <div className="flex items-center">
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  General Settings
                </div>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'notifications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                title="Push Notifications"
                aria-label="Push Notifications"
              >
                <div className="flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Push Notifications
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'general' ? (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Work Hours Settings */}
                <div>
                  <div className="flex items-center mb-4">
                    <Clock className="h-6 w-6 text-blue-600 mr-2" />
                    <h3 className="text-xl font-semibold text-gray-900">Work Hours Configuration</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Work Start Time
                      </label>
                      <input
                        type="time"
                        value={settings.work_start_time}
                        onChange={(e) => handleInputChange('work_start_time', e.target.value)}
                        className="input-field"
                        title="Work start time"
                        aria-label="Work start time"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Work End Time
                      </label>
                      <input
                        type="time"
                        value={settings.work_end_time}
                        onChange={(e) => handleInputChange('work_end_time', e.target.value)}
                        className="input-field"
                        title="Work end time"
                        aria-label="Work end time"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Break Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="480"
                        value={settings.break_duration}
                        onChange={(e) => handleInputChange('break_duration', e.target.value)}
                        className="input-field"
                        title="Break duration in minutes"
                        aria-label="Break duration in minutes"
                      />
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Timer className="h-5 w-5 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Total Working Hours: {calculateWorkingHours()}
                        </p>
                        <p className="text-xs text-blue-600">
                          Standard working hours: {settings.work_start_time} - {settings.work_end_time} 
                          (excluding {settings.break_duration} min break)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attendance Rules */}
                <div>
                  <div className="flex items-center mb-4">
                    <AlertCircle className="h-6 w-6 text-orange-600 mr-2" />
                    <h3 className="text-xl font-semibold text-gray-900">Attendance Rules</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Grace Period (minutes)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={settings.grace_period}
                        onChange={(e) => handleInputChange('grace_period', e.target.value)}
                        className="input-field"
                        title="Grace period in minutes"
                        aria-label="Grace period in minutes"
                        placeholder="Enter grace period"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Grace period before marking as late
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Late Threshold (minutes)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={settings.late_threshold}
                        onChange={(e) => handleInputChange('late_threshold', e.target.value)}
                        className="input-field"
                        title="Late threshold in minutes"
                        aria-label="Late threshold in minutes"
                        placeholder="Enter late threshold"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Maximum late minutes before penalty
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Half-Day Threshold (hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        step="0.5"
                        value={settings.half_day_threshold}
                        onChange={(e) => handleInputChange('half_day_threshold', e.target.value)}
                        className="input-field"
                        title="Half-day threshold in hours"
                        aria-label="Half-day threshold in hours"
                        placeholder="Enter half-day threshold"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Minimum hours for half-day attendance
                      </p>
                    </div>
                  </div>
                </div>

                {/* Legacy Notifications */}
                <div>
                  <div className="flex items-center mb-4">
                    <Bell className="h-6 w-6 text-green-600 mr-2" />
                    <h3 className="text-xl font-semibold text-gray-900">Legacy Notifications & Feedback</h3>
                  </div>
                  <div className="space-y-4">
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Smartphone className="h-5 w-5 text-blue-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Browser Notifications</p>
                          <p className="text-sm text-gray-600">
                            Basic browser notification support (legacy)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          notificationStatus === 'granted' 
                            ? 'bg-green-100 text-green-800' 
                            : notificationStatus === 'denied'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {notificationStatus === 'granted' ? 'Enabled' : 
                           notificationStatus === 'denied' ? 'Blocked' : 'Not Set'}
                        </span>
                        {notificationStatus !== 'granted' && (
                          <button
                            type="button"
                            onClick={handleEnableNotifications}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                            title="Enable notifications"
                            aria-label="Enable notifications"
                          >
                            Enable
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Volume2 className="h-5 w-5 text-purple-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Voice Feedback</p>
                          <p className="text-sm text-gray-600">
                            Hear attendance confirmations and errors
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={testVoiceFeedback}
                        disabled={voiceTestPlaying}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Test voice feedback"
                        aria-label="Test voice feedback"
                      >
                        {voiceTestPlaying ? 'Playing...' : 'Test Voice'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary"
                    title="Save settings"
                    aria-label="Save settings"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            ) : (
              <NotificationSettings />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};