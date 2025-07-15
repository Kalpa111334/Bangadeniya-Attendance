import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  Settings as SettingsIcon, 
  Check, 
  X, 
  AlertCircle,
  Smartphone,
  Clock,
  Users,
  Shield,
  Zap,
  Download
} from 'lucide-react';
import { oneSignalService } from '../lib/oneSignalService';
import Swal from 'sweetalert2';

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export const NotificationSettings: React.FC = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: 'attendance',
      name: 'Attendance Updates',
      description: 'Check-in/out confirmations, late arrivals, and timing violations',
      icon: Clock,
      enabled: true,
      priority: 'normal'
    },
    {
      id: 'alerts',
      name: 'Important Alerts',
      description: 'Absence notifications, overtime alerts, and urgent updates',
      icon: AlertCircle,
      enabled: true,
      priority: 'high'
    },
    {
      id: 'system',
      name: 'System Updates',
      description: 'Maintenance schedules, new features, and version updates',
      icon: SettingsIcon,
      enabled: true,
      priority: 'normal'
    },
    {
      id: 'security',
      name: 'Security Notifications',
      description: 'Security updates, login alerts, and system security events',
      icon: Shield,
      enabled: true,
      priority: 'urgent'
    }
  ]);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      setLoading(true);
      
      // Initialize OneSignal
      const initialized = await oneSignalService.initialize();
      
      if (initialized) {
        // Get current status
        setIsSubscribed(oneSignalService.getSubscriptionStatus());
        setPermission(oneSignalService.getNotificationPermission());
        
        // Load saved preferences
        loadNotificationPreferences();
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationPreferences = () => {
    const saved = localStorage.getItem('notification_preferences');
    if (saved) {
      try {
        const preferences = JSON.parse(saved);
        setCategories(prev => prev.map(cat => ({
          ...cat,
          enabled: preferences[cat.id] !== false
        })));
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
  };

  const saveNotificationPreferences = (newCategories: NotificationCategory[]) => {
    const preferences: { [key: string]: boolean } = {};
    newCategories.forEach(cat => {
      preferences[cat.id] = cat.enabled;
    });
    localStorage.setItem('notification_preferences', JSON.stringify(preferences));
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      
      let success = false;
      
      if (permission === 'default') {
        // Request permission first
        success = await oneSignalService.requestPermission();
        if (success) {
          success = await oneSignalService.subscribe();
        }
      } else if (permission === 'granted') {
        // Just subscribe
        success = await oneSignalService.subscribe();
      } else {
        // Permission denied - show instructions
        await showPermissionInstructions();
        return;
      }

      if (success) {
        setIsSubscribed(true);
        setPermission('granted');
        
        // Send welcome notification
        await oneSignalService.sendNotification({
          title: 'Notifications Enabled!',
          message: 'You will now receive real-time attendance updates and important alerts.',
          type: 'system',
          priority: 'normal',
          data: { welcome: true }
        });

        Swal.fire({
          icon: 'success',
          title: 'Notifications Enabled',
          text: 'You will now receive real-time updates!',
          confirmButtonColor: '#10B981',
        });
      } else {
        throw new Error('Failed to subscribe to notifications');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      Swal.fire({
        icon: 'error',
        title: 'Subscription Failed',
        text: 'Unable to enable notifications. Please try again.',
        confirmButtonColor: '#EF4444',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      setLoading(true);
      
      const result = await Swal.fire({
        title: 'Disable Notifications?',
        text: 'You will no longer receive attendance updates and alerts.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Yes, disable',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        const success = await oneSignalService.unsubscribe();
        
        if (success) {
          setIsSubscribed(false);
          
          Swal.fire({
            icon: 'success',
            title: 'Notifications Disabled',
            text: 'You will no longer receive push notifications.',
            confirmButtonColor: '#10B981',
          });
        } else {
          throw new Error('Failed to unsubscribe');
        }
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Unable to disable notifications. Please try again.',
        confirmButtonColor: '#EF4444',
      });
    } finally {
      setLoading(false);
    }
  };

  const showPermissionInstructions = async () => {
    await Swal.fire({
      title: 'Enable Notifications',
      html: `
        <div class="text-left">
          <p class="mb-4">To receive notifications, please follow these steps:</p>
          <ol class="list-decimal list-inside space-y-2 text-sm">
            <li>Click the <strong>🔒</strong> or <strong>ℹ️</strong> icon in your browser's address bar</li>
            <li>Find "Notifications" in the permissions list</li>
            <li>Change the setting to <strong>"Allow"</strong></li>
            <li>Refresh this page and try again</li>
          </ol>
          <div class="mt-4 p-3 bg-blue-50 rounded-lg">
            <p class="text-sm text-blue-700">
              <strong>Note:</strong> Notification settings vary by browser. Look for a bell icon or "Site Settings" option.
            </p>
          </div>
        </div>
      `,
      confirmButtonColor: '#3B82F6',
      confirmButtonText: 'Got it'
    });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = categories.map(cat => 
      cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat
    );
    setCategories(newCategories);
    saveNotificationPreferences(newCategories);
  };

  const testNotification = async (category: NotificationCategory) => {
    try {
      const testMessages = {
        attendance: {
          title: 'Test Attendance Update',
          message: 'John Doe checked in at 9:00 AM',
          data: { test: true, employee: 'John Doe', action: 'check_in' }
        },
        alerts: {
          title: 'Test Alert',
          message: 'Jane Smith has not checked in today',
          data: { test: true, employee: 'Jane Smith', type: 'absence' }
        },
        system: {
          title: 'Test System Update',
          message: 'New feature: Enhanced reporting is now available!',
          data: { test: true, feature: 'enhanced_reporting' }
        },
        security: {
          title: 'Test Security Alert',
          message: 'Security update installed successfully',
          data: { test: true, update_type: 'security_patch' }
        }
      };

      const testData = testMessages[category.id as keyof typeof testMessages];
      
      await oneSignalService.sendNotification({
        title: testData.title,
        message: testData.message,
        type: category.id as any,
        priority: category.priority,
        data: testData.data
      });

      Swal.fire({
        icon: 'success',
        title: 'Test Notification Sent',
        text: 'Check your notifications to see the test message.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      Swal.fire({
        icon: 'error',
        title: 'Test Failed',
        text: 'Unable to send test notification.',
        confirmButtonColor: '#EF4444',
      });
    }
  };

  const downloadLogs = () => {
    const logs = oneSignalService.getNotificationLogs();
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notification-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getPermissionStatusColor = () => {
    switch (permission) {
      case 'granted': return 'text-green-600 bg-green-100';
      case 'denied': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getPermissionStatusText = () => {
    switch (permission) {
      case 'granted': return 'Allowed';
      case 'denied': return 'Blocked';
      default: return 'Not Set';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading notification settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Push Notifications</h3>
          <p className="text-sm text-gray-600">Manage your notification preferences</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPermissionStatusColor()}`}>
            {getPermissionStatusText()}
          </span>
          {isSubscribed ? (
            <span className="px-2 py-1 text-xs font-medium rounded-full text-green-600 bg-green-100">
              Subscribed
            </span>
          ) : (
            <span className="px-2 py-1 text-xs font-medium rounded-full text-gray-600 bg-gray-100">
              Not Subscribed
            </span>
          )}
        </div>
      </div>

      {/* Main Toggle */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isSubscribed ? (
              <Bell className="h-6 w-6 text-green-600 mr-3" />
            ) : (
              <BellOff className="h-6 w-6 text-gray-400 mr-3" />
            )}
            <div>
              <h4 className="font-medium text-gray-900">Push Notifications</h4>
              <p className="text-sm text-gray-600">
                {isSubscribed 
                  ? 'Receive real-time updates and alerts' 
                  : 'Enable to receive important updates'
                }
              </p>
            </div>
          </div>
          <button
            onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isSubscribed
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:bg-gray-400 disabled:cursor-not-allowed`}
          >
            {loading ? 'Loading...' : isSubscribed ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      {/* Notification Categories */}
      {isSubscribed && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Notification Categories</h4>
          
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <div key={category.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start">
                    <IconComponent className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h5 className="font-medium text-gray-900">{category.name}</h5>
                        <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                          category.priority === 'urgent' ? 'text-red-600 bg-red-100' :
                          category.priority === 'high' ? 'text-orange-600 bg-orange-100' :
                          category.priority === 'normal' ? 'text-blue-600 bg-blue-100' :
                          'text-gray-600 bg-gray-100'
                        }`}>
                          {category.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => testNotification(category)}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => handleCategoryToggle(category.id)}
                      aria-label={`${category.enabled ? 'Disable' : 'Enable'} ${category.name} notifications`}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        category.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          category.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Debug Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Debug Information</h4>
          <button
            onClick={downloadLogs}
            className="flex items-center px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Download className="h-3 w-3 mr-1" />
            Export Logs
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">User ID:</span>
            <span className="ml-2 font-mono text-gray-900">
              {oneSignalService.getUserId() || 'Not available'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Service Status:</span>
            <span className={`ml-2 font-medium ${
              oneSignalService.isReady() ? 'text-green-600' : 'text-red-600'
            }`}>
              {oneSignalService.isReady() ? 'Ready' : 'Not Ready'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Browser:</span>
            <span className="ml-2 text-gray-900">
              {navigator.userAgent.split(' ').slice(-1)[0]}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Logs Count:</span>
            <span className="ml-2 text-gray-900">
              {oneSignalService.getNotificationLogs().length}
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Smartphone className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Notification Tips</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Notifications work best when the app is added to your home screen</li>
              <li>• Make sure your device allows notifications from this website</li>
              <li>• Test notifications to ensure they're working properly</li>
              <li>• Check your browser's notification settings if you're not receiving alerts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};