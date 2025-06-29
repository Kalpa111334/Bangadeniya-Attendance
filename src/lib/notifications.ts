// Push Notifications Service
export class NotificationService {
  private static instance: NotificationService;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return false;
      }

      // Register service worker if available
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');
      } catch (error) {
        console.warn('Service Worker registration failed, using fallback notifications');
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  async sendNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (Notification.permission !== 'granted') {
      await this.initialize();
    }

    if (Notification.permission === 'granted') {
      try {
        if (this.registration) {
          await this.registration.showNotification(title, {
            icon: '/icon-192x192.png',
            badge: '/icon-72x72.png',
            ...options,
          });
        } else {
          // Fallback to basic notification
          new Notification(title, {
            icon: '/icon-192x192.png',
            ...options,
          });
        }
      } catch (error) {
        console.error('Error sending notification:', error);
        // Fallback to basic notification
        try {
          new Notification(title, {
            icon: '/icon-192x192.png',
            ...options,
          });
        } catch (fallbackError) {
          console.error('Fallback notification also failed:', fallbackError);
        }
      }
    }
  }

  async notifyAttendance(employeeName: string, action: string, time: string): Promise<void> {
    const title = 'Attendance Update';
    const body = `${employeeName} ${action} at ${time}`;
    
    await this.sendNotification(title, {
      body,
      tag: 'attendance',
      requireInteraction: false,
      data: {
        employeeName,
        action,
        time,
      },
    });
  }
}

export const notificationService = NotificationService.getInstance();