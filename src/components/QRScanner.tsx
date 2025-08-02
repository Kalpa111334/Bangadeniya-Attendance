import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Camera, X, CheckCircle, AlertCircle, RotateCcw, Wifi, WifiOff, 
  Settings, Flashlight, FlashlightOff, Target
} from 'lucide-react';
import QrScanner from 'qr-scanner';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import { notificationService } from '../lib/notifications';
import { oneSignalService } from '../lib/oneSignalService';
import { voiceService } from '../lib/voice';

interface QRScannerProps {
  onClose: () => void;
}

interface ScannerState {
  status: 'initializing' | 'ready' | 'scanning' | 'processing';
  error: string;
  isOnline: boolean;
  flashEnabled: boolean;
  lightLevel: number;
}

interface AttendanceRecord {
  employeeId: string;
  timestamp: string;
  action: 'check-in' | 'check-out';
  isLate?: boolean;
  totalHours?: number;
}

interface Employee {
  id: string;
  name: string;
  qr_code: string;
  first_name: string;
  last_name: string;
  [key: string]: any;
}

const COOLDOWN_PERIODS = {
  SCAN: 2000, // 2 seconds between scans
  CHECKIN_TO_CHECKOUT: 3 * 60 * 1000, // 3 minutes
  CHECKOUT_TO_CHECKIN: 3 * 60 * 1000, // 3 minutes
} as const;

const THRESHOLDS = {
  MIN_LIGHT_LEVEL: 5, // 5 lux minimum
  MAX_SCAN_TIME: 500, // 0.5 seconds max scan time
} as const;

export const QRScanner: React.FC<QRScannerProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const isMountedRef = useRef(true);
  const lastScanRef = useRef<{ [key: string]: number }>({});
  const lightMonitoringIntervalRef = useRef<number | null>(null);
  const [hasCamera, setHasCamera] = useState(false);

  const [scannerState, setScannerState] = useState<ScannerState>({
    status: 'initializing',
    error: '',
    isOnline: navigator.onLine,
    flashEnabled: false,
    lightLevel: 0,
  });

  // Initialize scanner and set up event listeners
  useEffect(() => {
    isMountedRef.current = true;
    const checkCamera = async () => {
      try {
        const hasCamera = await QrScanner.hasCamera();
        setHasCamera(hasCamera);
      } catch (error) {
        console.error('Error checking camera:', error);
        setHasCamera(false);
      }
    };
    
    checkCamera();
    initializeScanner();
    const cleanupNetwork = setupNetworkListeners();

    return () => {
      isMountedRef.current = false;
      cleanup();
      cleanupNetwork();
    };
  }, []);

  const initializeScanner = async (): Promise<void> => {
    if (!videoRef.current) return;

    try {
      const qrScanner = new QrScanner(
        videoRef.current,
        handleScan,
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 10,
          calculateScanRegion: (video: HTMLVideoElement) => {
            const size = Math.min(video.videoWidth, video.videoHeight) * 0.7;
            const x = (video.videoWidth - size) / 2;
            const y = (video.videoHeight - size) / 2;
            return { x, y, width: size, height: size };
          }
        }
      );

      scannerRef.current = qrScanner;
        await qrScanner.start();

      updateScannerState({ status: 'ready' });
        startLightLevelMonitoring();
    } catch (error: any) {
      handleError(error);
    }
  };

  const handleScan = async (result: { data: string }): Promise<void> => {
    const qrData = result.data;
    
    // Prevent duplicate scans
    if (isRecentlySeen(qrData)) return;
    lastScanRef.current[qrData] = Date.now();

    updateScannerState({ status: 'processing' });

    try {
      const employeeData = await validateQRCode(qrData);
      if (!employeeData) {
        throw new Error('Invalid QR code');
      }

      await processAttendance(employeeData);
      updateScannerState({ status: 'ready' });
    } catch (error: any) {
      handleError(error);
      updateScannerState({ status: 'ready' });
    }
  };

  const validateQRCode = async (qrData: string): Promise<Employee | null> => {
    try {
      const { data: employee, error } = await supabase
        .from('employees')
        .select('*')
        .eq('qr_code', qrData)
        .single();

      if (error || !employee) {
        throw new Error('Invalid QR code');
      }

      return employee as Employee;
    } catch (error) {
      throw new Error('Failed to validate QR code');
    }
  };

  const processAttendance = async (employee: Employee): Promise<void> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if there's an existing attendance record for today
      const { data: existingRecord, error: fetchError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error fetching attendance:', fetchError);
        throw new Error('Failed to check existing attendance');
      }

      const now = new Date();
      let updateData: any = {};

      if (!existingRecord) {
        // First check-in of the day
        updateData = {
            employee_id: employee.id,
            date: today,
          first_check_in: now.toISOString(),
          is_late: await isLate(now),
          total_hours: 0
        };
      } else {
        // Determine which field to update based on existing data
        if (!existingRecord.first_check_out) {
          // Check for three-minute cool-down period
          const firstCheckInTime = new Date(existingRecord.first_check_in);
          const timeDifference = now.getTime() - firstCheckInTime.getTime();
          
          if (timeDifference < 3 * 60 * 1000) { // 3 minutes in milliseconds
            throw new Error('Please wait at least 3 minutes between first check-in and first check-out');
          }

          updateData.first_check_out = now.toISOString();
          updateData.total_hours = calculateHours(
            new Date(existingRecord.first_check_in),
            now
          );
        } else if (!existingRecord.second_check_in) {
          updateData.second_check_in = now.toISOString();
        } else if (!existingRecord.second_check_out) {
          updateData.second_check_out = now.toISOString();
          const firstSession = calculateHours(
            new Date(existingRecord.first_check_in),
            new Date(existingRecord.first_check_out)
          );
          const secondSession = calculateHours(
            new Date(existingRecord.second_check_in),
            now
          );
          updateData.total_hours = firstSession + secondSession;
        } else {
          throw new Error('All check-ins and check-outs are completed for today');
        }
      }

      // Perform the database update
        const { error: updateError } = await supabase
          .from('attendance_records')
        .upsert({
          ...existingRecord,
          ...updateData
        })
        .select();

      if (updateError) {
        console.error('Error updating attendance:', updateError);
        throw new Error('Failed to update attendance');
      }

      // Show success feedback and notify
      await showSuccessFeedback(
        employee, 
        determineActionType(existingRecord, updateData), 
        now.toISOString()
      );
    } catch (error: any) {
      handleError(error);
      throw error;
    }
  };

  const isLate = async (checkInTime: Date): Promise<boolean> => {
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'work_start_time')
        .single();

    const startTime = settings?.value || '09:00';
    const [hours, minutes] = startTime.split(':').map(Number);
    
    const scheduleTime = new Date(checkInTime);
    scheduleTime.setHours(hours, minutes, 0, 0);

    return checkInTime > scheduleTime;
  };

  const calculateHours = (start: Date, end: Date): number => {
    return Number(((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2));
  };

  const determineActionType = (
    existingRecord: any,
    updateData: any
  ): string => {
    if (!existingRecord) return 'check-in';
    if (updateData.first_check_out) return 'check-out';
    if (updateData.second_check_in) return 'check-in';
    if (updateData.second_check_out) return 'check-out';
    return 'check-in';
  };

  const showSuccessFeedback = async (employee: Employee, action: string, timestamp: string): Promise<void> => {
    const formattedTime = format(new Date(timestamp), 'hh:mm a');
    const actionText = action === 'check-in' ? 'Check-in' : 'Check-out';
    const message = `${employee.first_name} ${employee.last_name} ${actionText.toLowerCase()} successful at ${formattedTime}`;
    
    await voiceService.speak(message);
    await Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: message,
      timer: 2000,
      showConfirmButton: false
    });
  };

  const notifyAttendance = async (employee: Employee, action: string, record: AttendanceRecord): Promise<void> => {
    const title = `${employee.name} ${action}`;
    const message = record.isLate 
      ? `Late ${action} at ${format(new Date(record.timestamp), 'hh:mm a')}`
      : `${action} at ${format(new Date(record.timestamp), 'hh:mm a')}`;

    await notificationService.sendNotification(title, { body: message });
    await oneSignalService.sendNotification({
      title,
      message,
      type: 'attendance',
      priority: 'normal'
    });
  };

  const startLightLevelMonitoring = (): void => {
    if (!videoRef.current) return;

    const detectLightLevel = () => {
      if (!videoRef.current) return;

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let totalBrightness = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalBrightness += (r + g + b) / 3;
      }

      const averageBrightness = totalBrightness / (data.length / 4);
      const normalizedLightLevel = Math.round((averageBrightness / 255) * 100);

      updateScannerState({ lightLevel: normalizedLightLevel });
    };

    lightMonitoringIntervalRef.current = window.setInterval(detectLightLevel, 1000);
  };

  const toggleFlash = async (): Promise<void> => {
    try {
      if (scannerRef.current) {
        if (scannerState.flashEnabled) {
        await scannerRef.current.turnFlashOff();
        } else {
          await scannerRef.current.turnFlashOn();
        }
        updateScannerState({ flashEnabled: !scannerState.flashEnabled });
      }
    } catch (error) {
      console.error('Failed to toggle flash:', error);
    }
  };

  const setupNetworkListeners = (): () => void => {
    const handleOnline = () => updateScannerState({ isOnline: true });
    const handleOffline = () => updateScannerState({ isOnline: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  };

  const cleanup = (): void => {
    if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      scannerRef.current = null;
    }
    
    if (lightMonitoringIntervalRef.current !== null) {
      window.clearInterval(lightMonitoringIntervalRef.current);
      lightMonitoringIntervalRef.current = null;
    }
  };

  const handleError = (error: any): void => {
    let errorMessage = 'An unknown error occurred';
    
    if (error.message.includes('3 minutes between first check-in and first check-out')) {
      errorMessage = 'Please wait at least 3 minutes between your first check-in and first check-out.';
      
      // Use SweetAlert for a more user-friendly notification
      Swal.fire({
        icon: 'warning',
        title: 'Wait Required',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } else {
      // Existing error handling logic
      errorMessage = error.message || 'Failed to process attendance';
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    }

    console.error('Attendance processing error:', error);
    
    // Optional: Add voice notification for accessibility
    voiceService.announceError(errorMessage);
  };

  const isRecentlySeen = (qrCode: string): boolean => {
    const lastScan = lastScanRef.current[qrCode];
    return Boolean(lastScan) && (Date.now() - lastScan) < COOLDOWN_PERIODS.SCAN;
  };

  const updateScannerState = (newState: Partial<ScannerState>): void => {
    if (isMountedRef.current) {
      setScannerState(prev => ({ ...prev, ...newState }));
    }
  };

  const getLightLevelClass = (level: number): string => {
    return level < THRESHOLDS.MIN_LIGHT_LEVEL ? 'bg-red-500' : 'bg-green-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-full max-w-lg mx-4">
        <div className="relative">
                <video
                  ref={videoRef}
            className="w-full aspect-square object-cover rounded-lg"
          />
          
          {/* Scanner overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
            <Target className="w-48 h-48 text-white opacity-50" />
                      </div>

          {/* Status indicators */}
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            {scannerState.isOnline ? (
              <Wifi className="text-green-500" size={20} />
            ) : (
              <WifiOff className="text-red-500" size={20} />
            )}
            <div className={`h-3 w-3 rounded-full ${getLightLevelClass(scannerState.lightLevel)}`} />
                </div>

          {/* Controls */}
          <div className="absolute bottom-4 right-4 flex space-x-2">
            {hasCamera && (
              <button
                onClick={toggleFlash}
                className="p-2 bg-white rounded-full shadow-lg"
              >
                {scannerState.flashEnabled ? (
                  <FlashlightOff size={24} />
                ) : (
                  <Flashlight size={24} />
                )}
              </button>
            )}
            </div>

          {/* Error display */}
          {scannerState.error && (
            <div className="absolute bottom-4 left-4 right-16 bg-red-100 text-red-700 p-2 rounded-lg text-sm flex items-center">
              <AlertCircle size={16} className="mr-2" />
              {scannerState.error}
              </div>
            )}
              </div>
              
        {/* Close button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg flex items-center"
          >
            <X size={20} className="mr-2" />
            Close Scanner
          </button>
                </div>
            </div>
          </div>
  );
};