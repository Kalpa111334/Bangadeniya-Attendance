declare module 'react-onesignal' {
  interface OneSignalType {
    init(config: any): Promise<void>;
    on(event: string, callback: (data: any) => void): void;
    User: {
      PushSubscription: {
        id: string;
        optIn(): Promise<void>;
        optOut(): Promise<void>;
      };
    };
    Notifications: {
      permission: NotificationPermission;
      requestPermission(): Promise<NotificationPermission>;
    };
  }

  const OneSignal: OneSignalType;
  export default OneSignal;
} 