import OneSignal from 'react-onesignal';

export interface NotificationData {
  title: string;
  message: string;
  type: 'attendance' | 'system' | 'alert' | 'reminder';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data?: any;
  imageUrl?: string;
  actionButtons?: Array<{
    id: string;
    text: string;
    icon?: string;
    url?: string;
  }>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  template: {
    headings: { [key: string]: string };
    contents: { [key: string]: string };
    data?: any;
    buttons?: Array<{
      id: string;
      text: string;
      icon?: string;
      url?: string;
    }>;
    chrome_web_icon?: string;
    chrome_web_image?: string;
    chrome_web_badge?: string;
  };
}

export class OneSignalService {
  private static instance: OneSignalService;
  private isInitialized: boolean = false;
  private appId: string = '';
  private userId: string | null = null;
  private subscriptionStatus: boolean = false;
  private notificationPermission: NotificationPermission = 'default';

  // OneSignal Configuration
  private readonly config = {
    appId: import.meta.env.VITE_ONESIGNAL_APP_ID || '',
    safari_web_id: import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID || '',
    restApiKey: import.meta.env.VITE_ONESIGNAL_REST_API_KEY || '',
    notifyButton: {
      enable: true,
      size: 'medium',
      theme: 'default',
      position: 'bottom-right',
      showCredit: false,
      text: {
        'tip.state.unsubscribed': 'Subscribe to notifications',
        'tip.state.subscribed': "You're subscribed to notifications",
        'tip.state.blocked': "You've blocked notifications",
        'message.prenotify': 'Click to subscribe to notifications',
        'message.action.subscribed': "Thanks for subscribing!",
        'message.action.resubscribed': "You're subscribed to notifications",
        'message.action.unsubscribed': "You won't receive notifications again",
        'dialog.main.title': 'Manage Site Notifications',
        'dialog.main.button.subscribe': 'SUBSCRIBE',
        'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
        'dialog.blocked.title': 'Unblock Notifications',
        'dialog.blocked.message': "Follow these instructions to allow notifications:"
      }
    },
    welcomeNotification: {
      disable: false,
      title: 'Welcome to AttendanceHub!',
      message: 'You will now receive real-time attendance updates and system notifications.',
      url: ''
    },
    promptOptions: {
      slidedown: {
        enabled: true,
        actionMessage: "We'd like to show you notifications for attendance updates and important alerts.",
        acceptButtonText: "Allow",
        cancelButtonText: "No Thanks",
        categories: {
          tags: [
            {
              tag: "attendance",
              label: "Attendance Updates",
              checked: true
            },
            {
              tag: "system",
              label: "System Notifications",
              checked: true
            },
            {
              tag: "alerts",
              label: "Important Alerts",
              checked: true
            }
          ]
        }
      }
    }
  };

  private constructor() {}

  static getInstance(): OneSignalService {
    if (!OneSignalService.instance) {
      OneSignalService.instance = new OneSignalService();
    }
    return OneSignalService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    // Check if required configuration is available
    if (!this.config.appId) {
      console.warn('OneSignal App ID not configured. Skipping initialization.');
      return false;
    }

    try {
      console.log('Initializing OneSignal...');

      // Set the flag immediately to prevent multiple initializations
      this.isInitialized = true;

      // Initialize OneSignal
      await OneSignal.init({
        appId: this.config.appId,
        safari_web_id: this.config.safari_web_id,
        notifyButton: this.config.notifyButton,
        welcomeNotification: this.config.welcomeNotification,
        promptOptions: this.config.promptOptions,
        allowLocalhostAsSecureOrigin: true, // For development
      });

      // Set up event listeners
      this.setupEventListeners();

      // Get initial state
      await this.updateSubscriptionStatus();
      
      console.log('OneSignal initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Error initializing OneSignal:', error);
      // Reset the flag if initialization fails to allow retry
      this.isInitialized = false;
      return false;
    }
  }

  private setupEventListeners(): void {
    // Subscription change events
    OneSignal.on('subscriptionChange', (isSubscribed) => {
      console.log('Subscription changed:', isSubscribed);
      this.subscriptionStatus = isSubscribed;
      this.onSubscriptionChange(isSubscribed);
    });

    // Permission change events
    OneSignal.on('permissionChange', (permission) => {
      console.log('Permission changed:', permission);
      this.notificationPermission = permission;
      this.onPermissionChange(permission);
    });

    // Notification display events
    OneSignal.on('notificationDisplay', (event) => {
      console.log('Notification displayed:', event);
      this.onNotificationDisplay(event);
    });

    // Notification click events
    OneSignal.on('notificationClick', (event) => {
      console.log('Notification clicked:', event);
      this.onNotificationClick(event);
    });

    // Notification dismiss events
    OneSignal.on('notificationDismiss', (event) => {
      console.log('Notification dismissed:', event);
      this.onNotificationDismiss(event);
    });
  }

  private async updateSubscriptionStatus(): Promise<void> {
    try {
      this.notificationPermission = await OneSignal.Notifications.permission;
      this.subscriptionStatus = this.notificationPermission === 'granted';
      this.userId = await OneSignal.User.PushSubscription.id;
    } catch (error) {
      console.error('Error updating subscription status:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await OneSignal.Notifications.requestPermission();
      this.notificationPermission = permission;
      await this.updateSubscriptionStatus();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }

  async subscribe(): Promise<boolean> {
    try {
      await OneSignal.User.PushSubscription.optIn();
      await this.updateSubscriptionStatus();
      return this.subscriptionStatus;
    } catch (error) {
      console.error('Error subscribing:', error);
      return false;
    }
  }

  async unsubscribe(): Promise<boolean> {
    try {
      await OneSignal.User.PushSubscription.optOut();
      await this.updateSubscriptionStatus();
      return !this.subscriptionStatus;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    }
  }

  async sendNotification(data: NotificationData): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if REST API key is configured
      if (!this.config.restApiKey) {
        console.warn('OneSignal REST API key not configured. Cannot send notifications.');
        return false;
      }

      const notification = {
        app_id: this.config.appId,
        headings: { en: data.title },
        contents: { en: data.message },
        data: {
          type: data.type,
          priority: data.priority,
          timestamp: new Date().toISOString(),
          ...data.data
        },
        chrome_web_icon: data.imageUrl || '/icon-192x192.png',
        chrome_web_badge: '/icon-72x72.png',
        included_segments: ['All'],
        web_buttons: data.actionButtons?.map(button => ({
          id: button.id,
          text: button.text,
          icon: button.icon,
          url: button.url
        }))
      };

      // Set priority-based delivery options
      switch (data.priority) {
        case 'urgent':
          Object.assign(notification, {
            priority: 10,
            ttl: 3600, // 1 hour
            android_channel_id: 'urgent-notifications'
          });
          break;
        case 'high':
          Object.assign(notification, {
            priority: 8,
            ttl: 86400, // 24 hours
            android_channel_id: 'high-priority-notifications'
          });
          break;
        case 'normal':
          Object.assign(notification, {
            priority: 5,
            ttl: 259200, // 3 days
            android_channel_id: 'default-notifications'
          });
          break;
        case 'low':
          Object.assign(notification, {
            priority: 3,
            ttl: 604800, // 7 days
            android_channel_id: 'low-priority-notifications'
          });
          break;
      }

      // Send via OneSignal REST API
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.config.restApiKey}`
        },
        body: JSON.stringify(notification)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('Notification sent successfully:', result);
        this.logNotificationEvent('sent', data, result);
        return true;
      } else {
        console.error('Failed to send notification:', result);
        this.logNotificationEvent('failed', data, result);
        return false;
      }
    } catch (error: unknown) {
      console.error('Error sending notification:', error);
      this.logNotificationEvent('error', data, { error: (error as Error).message });
      return false;
    }
  }

  // Attendance-specific notification methods
  async notifyAttendanceEvent(
    employeeName: string,
    action: string,
    timestamp: string,
    isLate?: boolean,
    cooldownRemaining?: number
  ): Promise<boolean> {
    const actionText = this.formatActionText(action);
    const timeStr = new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    let title = 'Attendance Update';
    let message = `${employeeName} ${actionText} at ${timeStr}`;
    let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';

    if (isLate) {
      title = 'Late Arrival Alert';
      message = `⚠️ ${employeeName} checked in late at ${timeStr}`;
      priority = 'high';
    }

    if (cooldownRemaining && cooldownRemaining > 0) {
      title = 'Check-in Timing Violation';
      message = `❌ ${employeeName} attempted early check-in. ${Math.ceil(cooldownRemaining / 60000)} minutes remaining.`;
      priority = 'high';
    }

    return await this.sendNotification({
      title,
      message,
      type: 'attendance',
      priority,
      data: {
        employeeName,
        action,
        timestamp,
        isLate,
        cooldownRemaining
      },
      imageUrl: '/icon-192x192.png',
      actionButtons: [
        {
          id: 'view_dashboard',
          text: 'View Dashboard',
          url: '/'
        }
      ]
    });
  }

  async notifyAbsence(employeeName: string, date: string): Promise<boolean> {
    return await this.sendNotification({
      title: 'Absence Alert',
      message: `${employeeName} has not checked in today (${date})`,
      type: 'alert',
      priority: 'high',
      data: {
        employeeName,
        date,
        type: 'absence'
      },
      imageUrl: '/icon-192x192.png',
      actionButtons: [
        {
          id: 'view_reports',
          text: 'View Reports',
          url: '/reports'
        }
      ]
    });
  }

  async notifyScheduleChange(
    employeeName: string,
    date: string,
    oldShift: string,
    newShift: string
  ): Promise<boolean> {
    return await this.sendNotification({
      title: 'Schedule Change',
      message: `${employeeName}'s shift on ${date} changed from ${oldShift} to ${newShift}`,
      type: 'attendance',
      priority: 'normal',
      data: {
        employeeName,
        date,
        oldShift,
        newShift,
        type: 'schedule_change'
      },
      imageUrl: '/icon-192x192.png',
      actionButtons: [
        {
          id: 'view_roster',
          text: 'View Roster',
          url: '/roster'
        }
      ]
    });
  }

  async notifyOvertime(
    employeeName: string,
    hours: number,
    date: string
  ): Promise<boolean> {
    return await this.sendNotification({
      title: 'Overtime Alert',
      message: `${employeeName} worked ${hours} hours overtime on ${date}`,
      type: 'attendance',
      priority: 'normal',
      data: {
        employeeName,
        hours,
        date,
        type: 'overtime'
      },
      imageUrl: '/icon-192x192.png'
    });
  }

  // System notification methods
  async notifySystemMaintenance(
    startTime: string,
    duration: string,
    description: string
  ): Promise<boolean> {
    return await this.sendNotification({
      title: 'Scheduled Maintenance',
      message: `System maintenance scheduled for ${startTime} (${duration}). ${description}`,
      type: 'system',
      priority: 'high',
      data: {
        startTime,
        duration,
        description,
        type: 'maintenance'
      },
      imageUrl: '/icon-192x192.png',
      actionButtons: [
        {
          id: 'view_details',
          text: 'View Details',
          url: '/settings'
        }
      ]
    });
  }

  async notifyNewFeature(
    featureName: string,
    description: string,
    version: string
  ): Promise<boolean> {
    return await this.sendNotification({
      title: 'New Feature Available',
      message: `🎉 ${featureName} is now available! ${description}`,
      type: 'system',
      priority: 'normal',
      data: {
        featureName,
        description,
        version,
        type: 'new_feature'
      },
      imageUrl: '/icon-192x192.png',
      actionButtons: [
        {
          id: 'explore_feature',
          text: 'Explore',
          url: '/'
        }
      ]
    });
  }

  async notifySecurityUpdate(
    updateType: string,
    description: string,
    actionRequired: boolean
  ): Promise<boolean> {
    return await this.sendNotification({
      title: 'Security Update',
      message: `🔒 ${updateType}: ${description}${actionRequired ? ' Action required.' : ''}`,
      type: 'system',
      priority: actionRequired ? 'urgent' : 'high',
      data: {
        updateType,
        description,
        actionRequired,
        type: 'security_update'
      },
      imageUrl: '/icon-192x192.png',
      actionButtons: actionRequired ? [
        {
          id: 'take_action',
          text: 'Take Action',
          url: '/settings'
        }
      ] : undefined
    });
  }

  async notifySystemDowntime(
    reason: string,
    estimatedDuration: string
  ): Promise<boolean> {
    return await this.sendNotification({
      title: 'System Downtime',
      message: `⚠️ System temporarily unavailable: ${reason}. Estimated duration: ${estimatedDuration}`,
      type: 'system',
      priority: 'urgent',
      data: {
        reason,
        estimatedDuration,
        type: 'downtime'
      },
      imageUrl: '/icon-192x192.png'
    });
  }

  // Utility methods
  private formatActionText(action: string): string {
    const actionMap: { [key: string]: string } = {
      'first_check_in': 'checked in',
      'first_check_out': 'checked out for break',
      'second_check_in': 'returned from break',
      'second_check_out': 'checked out for the day',
    };
    return actionMap[action] || action;
  }

  private logNotificationEvent(
    event: 'sent' | 'failed' | 'error' | 'displayed' | 'clicked' | 'dismissed',
    data: any,
    result?: any
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      result,
      userId: this.userId
    };

    // Store in localStorage for debugging
    const logs = JSON.parse(localStorage.getItem('onesignal_logs') || '[]');
    logs.push(logEntry);
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    localStorage.setItem('onesignal_logs', JSON.stringify(logs));
    
    console.log('OneSignal Event:', logEntry);
  }

  // Event handlers (can be overridden)
  private onSubscriptionChange(isSubscribed: boolean): void {
    this.logNotificationEvent('sent', { type: 'subscription_change', isSubscribed });
  }

  private onPermissionChange(permission: NotificationPermission): void {
    this.logNotificationEvent('sent', { type: 'permission_change', permission });
  }

  private onNotificationDisplay(event: any): void {
    this.logNotificationEvent('displayed', event);
  }

  private onNotificationClick(event: any): void {
    this.logNotificationEvent('clicked', event);
  }

  private onNotificationDismiss(event: any): void {
    this.logNotificationEvent('dismissed', event);
  }

  // Getters
  getSubscriptionStatus(): boolean {
    return this.subscriptionStatus;
  }

  getNotificationPermission(): NotificationPermission {
    return this.notificationPermission;
  }

  getUserId(): string | null {
    return this.userId;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  // Get notification logs for debugging
  getNotificationLogs(): any[] {
    return JSON.parse(localStorage.getItem('onesignal_logs') || '[]');
  }

  // Clear notification logs
  clearNotificationLogs(): void {
    localStorage.removeItem('onesignal_logs');
  }
}

export const oneSignalService = OneSignalService.getInstance();