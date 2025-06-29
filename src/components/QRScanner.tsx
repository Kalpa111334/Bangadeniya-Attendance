import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Camera, X, CheckCircle, AlertCircle, RotateCcw, Wifi, WifiOff, 
  Settings, Activity, Flashlight, FlashlightOff, Target, Gauge, Clock
} from 'lucide-react';
import QrScanner from 'qr-scanner';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import { notificationService } from '../lib/notifications';
import { oneSignalService } from '../lib/oneSignalService';
import { voiceService } from '../lib/voice';
import { ScannerDiagnostics } from './ScannerDiagnostics';

interface QRScannerProps {
  onClose: () => void;
}

interface ScanCache {
  [qrCode: string]: number;
}

interface ScannerMetrics {
  fps: number;
  lightLevel: number;
  processingTime: number;
  scanCount: number;
  successRate: number;
}

interface AttendanceValidation {
  isValid: boolean;
  nextAction: string;
  errorMessage?: string;
  cooldownRemaining?: number;
  canProceed: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const isMountedRef = useRef(true);
  const initializingRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [scanCache, setScanCache] = useState<ScanCache>({});
  const [error, setError] = useState<string>('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [metrics, setMetrics] = useState<ScannerMetrics>({
    fps: 0,
    lightLevel: 0,
    processingTime: 0,
    scanCount: 0,
    successRate: 0
  });
  const [guidance, setGuidance] = useState<any>(null);
  const [scannerStatus, setScannerStatus] = useState<'initializing' | 'ready' | 'scanning' | 'processing'>('initializing');

  const SCAN_COOLDOWN = 2000; // 2 seconds between scans
  const CHECKOUT_TO_CHECKIN_COOLDOWN = 3 * 60 * 1000; // 3 minutes in milliseconds
  const MAX_SCAN_TIME = 500; // 0.5 seconds max scan time
  const MIN_LIGHT_LEVEL = 5; // 5 lux minimum

  // Performance monitoring
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lightDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const scanStartTime = useRef<number>(0);

  useEffect(() => {
    isMountedRef.current = true;
    
    const initializeAsync = async () => {
      if (!isMountedRef.current || initializingRef.current) return;
      
      // Add a longer delay to ensure DOM is fully stable
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!isMountedRef.current) return;
      
      await initializeScanner();
      
      if (!isMountedRef.current) return;
      
      startPerformanceMonitoring();
    };

    initializeAsync();
    
    // Monitor online status
    const handleOnline = () => {
      if (isMountedRef.current) setIsOnline(true);
    };
    const handleOffline = () => {
      if (isMountedRef.current) setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMountedRef.current = false;
      cleanup();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const initializeScanner = async () => {
    if (!isMountedRef.current || initializingRef.current) return;
    
    initializingRef.current = true;

    try {
      // Multiple checks to ensure video element is ready and connected
      if (!videoRef.current) {
        throw new Error('Video element not available');
      }

      if (!videoRef.current.isConnected) {
        throw new Error('Video element not connected to DOM');
      }

      if (isMountedRef.current) {
        setScannerStatus('initializing');
        setError('');
      }

      // Wait for video element to be fully rendered
      await new Promise(resolve => {
        if (videoRef.current?.offsetParent !== null) {
          resolve(void 0);
        } else {
          const observer = new MutationObserver(() => {
            if (videoRef.current?.offsetParent !== null) {
              observer.disconnect();
              resolve(void 0);
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
          
          // Fallback timeout
          setTimeout(() => {
            observer.disconnect();
            resolve(void 0);
          }, 1000);
        }
      });

      // Final check before proceeding
      if (!isMountedRef.current || !videoRef.current || !videoRef.current.isConnected) {
        throw new Error('Component unmounted or video element disconnected during initialization');
      }

      // Create QR scanner with error handling
      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => {
          if (isMountedRef.current) {
            handleScanResult(result.data);
          }
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 10, // Reduced for stability
          calculateScanRegion: (video) => {
            const size = Math.min(video.videoWidth, video.videoHeight) * 0.7;
            const x = (video.videoWidth - size) / 2;
            const y = (video.videoHeight - size) / 2;
            return { x, y, width: size, height: size };
          }
        }
      );

      // Check again before starting
      if (!isMountedRef.current || !videoRef.current || !videoRef.current.isConnected) {
        qrScanner.destroy();
        throw new Error('Component state changed during scanner creation');
      }

      scannerRef.current = qrScanner;

      // Add event listeners for video element lifecycle
      const videoElement = videoRef.current;
      
      const handleVideoError = (event: Event) => {
        console.error('Video error:', event);
        if (isMountedRef.current) {
          handleScannerError(new Error('Video stream error'));
        }
      };

      const handleVideoLoadStart = () => {
        console.log('Video load started');
      };

      const handleVideoCanPlay = () => {
        console.log('Video can play');
      };

      videoElement.addEventListener('error', handleVideoError);
      videoElement.addEventListener('loadstart', handleVideoLoadStart);
      videoElement.addEventListener('canplay', handleVideoCanPlay);

      // Start the scanner with additional error handling
      try {
        await qrScanner.start();
      } catch (startError: any) {
        // If start fails, try to get more specific error information
        if (startError.name === 'NotAllowedError') {
          throw new Error('Camera access denied. Please allow camera permissions and try again.');
        } else if (startError.name === 'NotFoundError') {
          throw new Error('No camera found. Please ensure your device has a working camera.');
        } else if (startError.name === 'NotReadableError') {
          throw new Error('Camera is being used by another application. Please close other camera apps and try again.');
        } else {
          throw startError;
        }
      }

      // Final verification that everything is working
      if (!isMountedRef.current || !videoRef.current || !videoRef.current.isConnected) {
        qrScanner.stop();
        qrScanner.destroy();
        throw new Error('Component unmounted during scanner start');
      }

      // Clean up event listeners
      const cleanup = () => {
        videoElement.removeEventListener('error', handleVideoError);
        videoElement.removeEventListener('loadstart', handleVideoLoadStart);
        videoElement.removeEventListener('canplay', handleVideoCanPlay);
      };

      // Store cleanup function for later use
      (qrScanner as any)._videoCleanup = cleanup;

      if (isMountedRef.current) {
        setScannerStatus('ready');
        setScanning(true);
        startLightLevelMonitoring();
      }

    } catch (error: any) {
      console.error('Error initializing scanner:', error);
      if (isMountedRef.current) {
        handleScannerError(error);
      }
    } finally {
      initializingRef.current = false;
    }
  };

  const startPerformanceMonitoring = () => {
    if (!isMountedRef.current) return;
    
    metricsIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      setMetrics(prev => ({
        ...prev,
        fps: 30, // Simulated FPS
        scanCount: prev.scanCount,
        successRate: prev.scanCount > 0 ? (prev.scanCount / (prev.scanCount + 1)) * 100 : 0
      }));
    }, 1000);
  };

  const startLightLevelMonitoring = () => {
    if (!videoRef.current || !isMountedRef.current) return;

    lightDetectionRef.current = setInterval(async () => {
      if (!isMountedRef.current || !videoRef.current || !scanning) return;
      
      const lightLevel = await detectLightLevel(videoRef.current);
      
      if (!isMountedRef.current) return;
      
      setMetrics(prev => ({ ...prev, lightLevel }));
      
      // Auto-enable flash in very low light
      if (lightLevel < MIN_LIGHT_LEVEL && !flashEnabled) {
        await enableFlash();
      }

      // Update guidance
      const comprehensiveGuidance = getComprehensiveGuidance(lightLevel);
      if (isMountedRef.current) {
        setGuidance(comprehensiveGuidance);
      }
    }, 2000);
  };

  const detectLightLevel = async (videoElement: HTMLVideoElement): Promise<number> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(50); // Default medium light level
        return;
      }

      canvas.width = 100;
      canvas.height = 100;

      try {
        ctx.drawImage(videoElement, 0, 0, 100, 100);
        const imageData = ctx.getImageData(0, 0, 100, 100);
        const data = imageData.data;

        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Calculate perceived brightness
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
          totalBrightness += brightness;
        }

        const avgBrightness = totalBrightness / (data.length / 4);
        resolve(avgBrightness);
      } catch (error) {
        console.warn('Could not detect light level:', error);
        resolve(50);
      }
    });
  };

  const getComprehensiveGuidance = (lightLevel: number): any => {
    return {
      lighting: {
        level: lightLevel,
        guidance: lightLevel < 30 ? 'Low light - consider enabling flash' : 'Good lighting conditions',
        needsFlash: lightLevel < 30
      },
      distance: {
        guidance: 'Position QR code in frame'
      },
      overall: lightLevel < 30 ? 'Adjust lighting for better scanning' : 'Optimal conditions for scanning'
    };
  };

  const validateAttendanceSequence = async (employee: any): Promise<AttendanceValidation> => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();

    try {
      // Get today's attendance record
      const { data: attendance, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If no attendance record exists, allow first check-in
      if (!attendance) {
        return {
          isValid: true,
          nextAction: 'first_check_in',
          canProceed: true
        };
      }

      // Check the sequence and timing
      if (attendance.first_check_in && !attendance.first_check_out) {
        // User has checked in but not checked out - only allow first check-out
        return {
          isValid: true,
          nextAction: 'first_check_out',
          canProceed: true
        };
      }

      if (attendance.first_check_in && attendance.first_check_out && !attendance.second_check_in) {
        // User has completed first check-in/out cycle
        // Check if 3-minute cooldown has passed
        const firstCheckOutTime = new Date(attendance.first_check_out);
        const timeSinceCheckOut = now.getTime() - firstCheckOutTime.getTime();
        const cooldownRemaining = CHECKOUT_TO_CHECKIN_COOLDOWN - timeSinceCheckOut;

        if (timeSinceCheckOut < CHECKOUT_TO_CHECKIN_COOLDOWN) {
          // Still in cooldown period
          const remainingMinutes = Math.ceil(cooldownRemaining / (60 * 1000));
          const remainingSeconds = Math.ceil((cooldownRemaining % (60 * 1000)) / 1000);
          
          return {
            isValid: false,
            nextAction: 'second_check_in',
            errorMessage: `Cooldown period active. Please wait ${remainingMinutes}m ${remainingSeconds}s before checking in again.`,
            cooldownRemaining,
            canProceed: false
          };
        }

        // Cooldown has passed, allow second check-in
        return {
          isValid: true,
          nextAction: 'second_check_in',
          canProceed: true
        };
      }

      if (attendance.second_check_in && !attendance.second_check_out) {
        // User has checked in for second time but not checked out - only allow second check-out
        return {
          isValid: true,
          nextAction: 'second_check_out',
          canProceed: true
        };
      }

      if (attendance.second_check_out) {
        // All attendance for today is complete
        return {
          isValid: false,
          nextAction: 'complete',
          errorMessage: 'All attendance records for today are complete. No further check-ins allowed.',
          canProceed: false
        };
      }

      // Fallback case
      return {
        isValid: false,
        nextAction: 'unknown',
        errorMessage: 'Unable to determine next action. Please contact administrator.',
        canProceed: false
      };

    } catch (error: any) {
      console.error('Error validating attendance sequence:', error);
      return {
        isValid: false,
        nextAction: 'error',
        errorMessage: 'Error validating attendance. Please try again.',
        canProceed: false
      };
    }
  };

  const handleScanResult = useCallback(async (qrCode: string) => {
    if (!isMountedRef.current) return;
    
    const now = Date.now();
    scanStartTime.current = now;
    
    try {
      if (isMountedRef.current) {
        setScannerStatus('processing');
      }
      
      // Check scan cooldown
      if (scanCache[qrCode] && (now - scanCache[qrCode]) < SCAN_COOLDOWN) {
        return;
      }

      // Update scan cache
      if (isMountedRef.current) {
        setScanCache(prev => ({ ...prev, [qrCode]: now }));
      }

      // Check processing time limit
      const processingStart = Date.now();
      
      // Provide immediate feedback
      await provideFeedback('success');
      
      // Check online status
      if (!isOnline) {
        throw new Error('No internet connection');
      }

      // Find employee
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('qr_code', qrCode)
        .eq('is_active', true)
        .single();

      if (employeeError || !employee) {
        throw new Error('Invalid QR code or employee not found');
      }

      // Validate attendance sequence and timing
      const validation = await validateAttendanceSequence(employee);
      
      if (!validation.canProceed) {
        // Show error message for timing violations
        await showTimingError(employee, validation);
        return;
      }

      // Process the attendance if validation passes
      await processAttendance(employee, validation.nextAction);

      const processingTime = Date.now() - processingStart;
      
      if (isMountedRef.current) {
        setMetrics(prev => ({ 
          ...prev, 
          processingTime,
          scanCount: prev.scanCount + 1
        }));
      }

      // Check if processing exceeded time limit
      if (processingTime > MAX_SCAN_TIME) {
        console.warn(`Processing time ${processingTime}ms exceeded limit of ${MAX_SCAN_TIME}ms`);
      }

    } catch (error: any) {
      console.error('Error processing QR scan:', error);
      await provideFeedback('error');
      if (isMountedRef.current) {
        handleProcessingError(error);
      }
    } finally {
      if (isMountedRef.current) {
        setScannerStatus('ready');
      }
    }
  }, [scanCache, isOnline, flashEnabled]);

  const showTimingError = async (employee: any, validation: AttendanceValidation) => {
    const employeeName = `${employee.first_name} ${employee.last_name}`;
    
    // Voice feedback for error
    voiceService.announceError(validation.errorMessage || 'Timing violation');

    // Send push notification for timing violation
    await oneSignalService.notifyAttendanceEvent(
      employeeName,
      validation.nextAction,
      new Date().toISOString(),
      false,
      validation.cooldownRemaining
    );

    // Enhanced visual feedback for timing errors
    Swal.fire({
      icon: 'warning',
      title: 'Check-in Timing Violation',
      html: `
        <div class="text-center">
          <div class="mb-4">
            <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg class="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
              </svg>
            </div>
          </div>
          <p class="text-lg font-semibold text-gray-800 mb-2">${employeeName}</p>
          <p class="text-orange-600 font-medium mb-4">${validation.errorMessage}</p>
          ${validation.cooldownRemaining ? `
            <div class="mt-4 p-3 bg-orange-50 rounded-lg">
              <div class="flex items-center justify-center">
                <svg class="w-5 h-5 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
                <p class="text-sm text-orange-700">
                  Cooldown: ${Math.ceil(validation.cooldownRemaining / (60 * 1000))} minutes remaining
                </p>
              </div>
            </div>
          ` : ''}
          <div class="mt-4 p-3 bg-blue-50 rounded-lg">
            <p class="text-xs text-blue-700">
              <strong>Timing Rules:</strong><br>
              • First check-in → First check-out → 3-minute cooldown → Second check-in → Second check-out
            </p>
          </div>
        </div>
      `,
      timer: 5000,
      timerProgressBar: true,
      confirmButtonColor: '#F59E0B',
      confirmButtonText: 'Understood',
      showConfirmButton: true,
    });

    // Haptic feedback for error
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]); // Error pattern
    }
  };

  const provideFeedback = async (type: 'success' | 'error'): Promise<void> => {
    if ('vibrate' in navigator) {
      if (type === 'success') {
        navigator.vibrate([100, 50, 100]); // Success pattern
      } else {
        navigator.vibrate([200, 100, 200]); // Error pattern
      }
    }
  };

  const processAttendance = async (employee: any, action: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date().toISOString();

    try {
      let { data: attendance, error: fetchError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let updateData: any = {};

      if (!attendance && action === 'first_check_in') {
        // Create new attendance record with first check-in
        const { isLate, lateDuration } = await checkIfLate(now);
        
        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert({
            employee_id: employee.id,
            date: today,
            first_check_in: now,
            is_late: isLate,
            late_duration: lateDuration,
          });

        if (insertError) throw insertError;
      } else if (attendance) {
        // Update existing attendance record
        switch (action) {
          case 'first_check_out':
            updateData.first_check_out = now;
            break;
          case 'second_check_in':
            updateData.second_check_in = now;
            break;
          case 'second_check_out':
            updateData.second_check_out = now;
            updateData.total_hours = calculateTotalHours(attendance, now);
            break;
          default:
            throw new Error(`Invalid action: ${action}`);
        }

        const { error: updateError } = await supabase
          .from('attendance_records')
          .update(updateData)
          .eq('id', attendance.id);

        if (updateError) throw updateError;
      } else {
        throw new Error(`Invalid state: No attendance record for action ${action}`);
      }

      if (isMountedRef.current) {
        await showSuccessFeedback(employee, action, now);
      }

    } catch (error: any) {
      console.error('Error processing attendance:', error);
      throw error;
    }
  };

  const checkIfLate = async (checkInTime: string): Promise<{ isLate: boolean; lateDuration: number }> => {
    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'work_start_time')
        .single();

      if (!settings) return { isLate: false, lateDuration: 0 };

      const workStartTime = settings.value;
      const [hours, minutes] = workStartTime.split(':').map(Number);
      
      const today = new Date();
      const workStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
      const checkIn = new Date(checkInTime);

      if (checkIn > workStart) {
        const lateDuration = Math.floor((checkIn.getTime() - workStart.getTime()) / (1000 * 60));
        return { isLate: true, lateDuration };
      }

      return { isLate: false, lateDuration: 0 };
    } catch (error) {
      console.error('Error checking if late:', error);
      return { isLate: false, lateDuration: 0 };
    }
  };

  const calculateTotalHours = (attendance: any, secondCheckOut: string): number => {
    const firstIn = new Date(attendance.first_check_in);
    const firstOut = new Date(attendance.first_check_out);
    const secondIn = new Date(attendance.second_check_in);
    const secondOut = new Date(secondCheckOut);

    const morning = (firstOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);
    const afternoon = (secondOut.getTime() - secondIn.getTime()) / (1000 * 60 * 60);

    return Math.round((morning + afternoon) * 100) / 100;
  };

  const showSuccessFeedback = async (employee: any, action: string, time: string) => {
    if (!isMountedRef.current) return;
    
    const employeeName = `${employee.first_name} ${employee.last_name}`;
    const timeStr = format(new Date(time), 'HH:mm:ss');
    const actionText = formatActionText(action);

    // Voice feedback
    voiceService.announceAttendance(employeeName, action, time);

    // Legacy push notification
    await notificationService.notifyAttendance(employeeName, actionText, timeStr);

    // OneSignal push notification
    await oneSignalService.notifyAttendanceEvent(employeeName, action, time);

    // Enhanced visual feedback with timing information
    Swal.fire({
      icon: 'success',
      title: 'Attendance Recorded',
      html: `
        <div class="text-center">
          <div class="mb-4">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg class="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
            </div>
          </div>
          <p class="text-lg font-semibold text-gray-800">${employeeName}</p>
          <p class="text-blue-600 font-medium">${actionText}</p>
          <p class="text-gray-500">${timeStr}</p>
          <div class="mt-4 p-3 bg-green-50 rounded-lg">
            <p class="text-sm text-green-700">✓ Scan completed in ${metrics.processingTime}ms</p>
            <p class="text-xs text-green-600 mt-1">Light level: ${metrics.lightLevel.toFixed(0)} lux</p>
          </div>
          ${getNextActionGuidance(action)}
        </div>
      `,
      timer: 4000,
      timerProgressBar: true,
      confirmButtonColor: '#10B981',
      showConfirmButton: false,
    });
  };

  const getNextActionGuidance = (currentAction: string): string => {
    switch (currentAction) {
      case 'first_check_in':
        return `
          <div class="mt-3 p-2 bg-blue-50 rounded-lg">
            <p class="text-xs text-blue-700">
              <strong>Next:</strong> Check out when leaving for break/lunch
            </p>
          </div>
        `;
      case 'first_check_out':
        return `
          <div class="mt-3 p-2 bg-orange-50 rounded-lg">
            <p class="text-xs text-orange-700">
              <strong>Next:</strong> Wait 3 minutes before checking in again
            </p>
          </div>
        `;
      case 'second_check_in':
        return `
          <div class="mt-3 p-2 bg-blue-50 rounded-lg">
            <p class="text-xs text-blue-700">
              <strong>Next:</strong> Check out when leaving for the day
            </p>
          </div>
        `;
      case 'second_check_out':
        return `
          <div class="mt-3 p-2 bg-green-50 rounded-lg">
            <p class="text-xs text-green-700">
              <strong>Complete:</strong> All attendance recorded for today
            </p>
          </div>
        `;
      default:
        return '';
    }
  };

  const formatActionText = (action: string): string => {
    const actionMap: { [key: string]: string } = {
      'first_check_in': 'First Check In',
      'first_check_out': 'First Check Out',
      'second_check_in': 'Second Check In',
      'second_check_out': 'Second Check Out',
    };
    return actionMap[action] || action;
  };

  const enableFlash = async () => {
    if (!isMountedRef.current) return;
    
    try {
      if (scannerRef.current) {
        await scannerRef.current.turnFlashOn();
        if (isMountedRef.current) {
          setFlashEnabled(true);
          await provideFeedback('success');
        }
      }
    } catch (error) {
      console.warn('Could not enable flash:', error);
    }
  };

  const disableFlash = async () => {
    if (!isMountedRef.current) return;
    
    try {
      if (scannerRef.current) {
        await scannerRef.current.turnFlashOff();
        if (isMountedRef.current) {
          setFlashEnabled(false);
        }
      }
    } catch (error) {
      console.warn('Could not disable flash:', error);
    }
  };

  const handleScannerError = (error: any) => {
    if (!isMountedRef.current) return;
    
    const errorType = error.name || 'unknown';
    const solutions = getErrorSolutions(errorType);
    
    setError(error.message || 'Scanner error occurred');
    
    Swal.fire({
      icon: 'error',
      title: 'Scanner Error',
      html: `
        <div class="text-left">
          <p class="mb-3 font-medium">${error.message}</p>
          <p class="mb-2 text-sm text-gray-600">Try these solutions:</p>
          <ul class="text-sm text-gray-700 space-y-1">
            ${solutions.map(s => `<li>• ${s}</li>`).join('')}
          </ul>
        </div>
      `,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Try Again',
      showCancelButton: true,
      cancelButtonText: 'Diagnostics',
      cancelButtonColor: '#3B82F6'
    }).then((result) => {
      if (!isMountedRef.current) return;
      
      if (result.dismiss === Swal.DismissReason.cancel) {
        setShowDiagnostics(true);
      } else if (result.isConfirmed) {
        // Reset initialization flag before retrying
        initializingRef.current = false;
        initializeScanner();
      }
    });
  };

  const getErrorSolutions = (errorType: string): string[] => {
    const solutions: { [key: string]: string[] } = {
      'NotAllowedError': [
        'Click the camera icon in your browser address bar',
        'Select "Allow" for camera access',
        'Refresh the page and try again',
        'Check browser settings for camera permissions'
      ],
      'NotFoundError': [
        'Ensure your device has a working camera',
        'Try switching between front/back camera',
        'Check if camera is being used by another app',
        'Restart your device if camera is not detected'
      ],
      'NotReadableError': [
        'Close other camera applications',
        'Restart your browser',
        'Try switching camera (front/back)',
        'Check if camera is physically blocked'
      ]
    };

    return solutions[errorType] || [
      'Try scanning again',
      'Check QR code quality',
      'Ensure good lighting',
      'Hold device steady'
    ];
  };

  const handleProcessingError = (error: any) => {
    if (!isMountedRef.current) return;
    
    const errorMessage = error.message || 'Failed to process attendance';
    setError(errorMessage);
    voiceService.announceError(errorMessage);
  };

  const cleanup = () => {
    // Stop and destroy QR scanner first
    if (scannerRef.current) {
      try {
        scannerRef.current.stop();
        
        // Call custom video cleanup if available
        if ((scannerRef.current as any)._videoCleanup) {
          (scannerRef.current as any)._videoCleanup();
        }
        
        scannerRef.current.destroy();
      } catch (error) {
        console.warn('Error during scanner cleanup:', error);
      }
      scannerRef.current = null;
    }
    
    // Properly cleanup video element to prevent play() interruption error
    if (videoRef.current) {
      try {
        // Pause the video first
        videoRef.current.pause();
        
        // Clear the source object to release media stream
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (error) {
              console.warn('Error stopping track:', error);
            }
          });
          videoRef.current.srcObject = null;
        }
        
        // Clear any other video sources
        videoRef.current.src = '';
        videoRef.current.load();
      } catch (error) {
        console.warn('Error during video cleanup:', error);
      }
    }
    
    // Clear intervals
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }
    
    if (lightDetectionRef.current) {
      clearInterval(lightDetectionRef.current);
      lightDetectionRef.current = null;
    }

    if (isMountedRef.current) {
      setScanning(false);
    }
    
    // Reset initialization flag
    initializingRef.current = false;
  };

  const getStatusColor = () => {
    switch (scannerStatus) {
      case 'initializing': return 'text-yellow-600';
      case 'ready': return 'text-green-600';
      case 'scanning': return 'text-blue-600';
      case 'processing': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getLightLevelColor = () => {
    if (metrics.lightLevel < MIN_LIGHT_LEVEL) return 'text-red-600';
    if (metrics.lightLevel < 30) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="modal-content max-w-lg">
          {/* Enhanced Header with Metrics */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Camera className="h-6 w-6 text-white mr-2" />
                <h3 className="text-lg font-semibold text-white">QR Scanner</h3>
              </div>
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-green-300" title="Online" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-300" title="Offline" />
                )}
                <button
                  onClick={() => setShowDiagnostics(true)}
                  className="text-white hover:text-gray-200 p-1"
                  title="Diagnostics"
                >
                  <Activity className="h-5 w-5" />
                </button>
                <button
                  onClick={flashEnabled ? disableFlash : enableFlash}
                  className="text-white hover:text-gray-200 p-1"
                  title={flashEnabled ? "Disable Flash" : "Enable Flash"}
                >
                  {flashEnabled ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
                </button>
                <button
                  onClick={onClose}
                  className="text-white hover:text-gray-200 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Real-time Metrics */}
            <div className="grid grid-cols-4 gap-2 text-xs text-white">
              <div className="text-center">
                <div className="font-medium">{metrics.fps.toFixed(0)}</div>
                <div className="opacity-75">FPS</div>
              </div>
              <div className="text-center">
                <div className={`font-medium ${getLightLevelColor()}`}>
                  {metrics.lightLevel.toFixed(0)}
                </div>
                <div className="opacity-75">Lux</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{metrics.processingTime}</div>
                <div className="opacity-75">ms</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{metrics.successRate.toFixed(0)}%</div>
                <div className="opacity-75">Success</div>
              </div>
            </div>
          </div>

          {/* Scanner Area */}
          <div className="p-4">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-red-800 font-medium text-sm">Scanner Error</h4>
                    <p className="text-red-700 text-xs mt-1">{error}</p>
                    <button
                      onClick={() => {
                        initializingRef.current = false;
                        initializeScanner();
                      }}
                      className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      <RotateCcw className="h-3 w-3 mr-1 inline" />
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  style={{
                    imageRendering: 'optimizeQuality',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}
                />
                
                {/* Scanning Overlay */}
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-white border-dashed rounded-lg w-64 h-64 flex items-center justify-center">
                      <div className="text-white text-center">
                        <Target className="w-12 h-12 mx-auto mb-2 animate-pulse" />
                        <p className="text-sm">Position QR code here</p>
                        <p className="text-xs opacity-75 mt-1">
                          {scannerStatus === 'processing' ? 'Processing...' : 'Auto-scan active'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Indicator */}
                <div className="absolute top-2 left-2 bg-black bg-opacity-50 rounded px-2 py-1">
                  <span className={`text-xs font-medium ${getStatusColor()}`}>
                    {scannerStatus.toUpperCase()}
                  </span>
                </div>

                {/* Flash Indicator */}
                {flashEnabled && (
                  <div className="absolute top-2 right-2 bg-yellow-500 rounded-full p-1">
                    <Flashlight className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            )}

            {/* Timing Rules Information */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Clock className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">Check-in/Check-out Rules</span>
              </div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>1️⃣ First check-in (start of day)</div>
                <div>2️⃣ First check-out (break/lunch)</div>
                <div>⏱️ 3-minute mandatory cooldown</div>
                <div>3️⃣ Second check-in (return from break)</div>
                <div>4️⃣ Second check-out (end of day)</div>
              </div>
            </div>

            {/* Guidance Panel */}
            {guidance && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <Gauge className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Scanning Guidance</span>
                </div>
                <div className="text-xs text-green-700 space-y-1">
                  <div>💡 {guidance.lighting?.guidance}</div>
                  <div>📏 {guidance.distance?.guidance}</div>
                  <div>🎯 {guidance.overall}</div>
                </div>
              </div>
            )}

            {/* Performance Info */}
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-600">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-1 ${
                    scanning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}></div>
                  {scanning ? 'Scanning Active' : 'Initializing...'}
                </div>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-1 ${
                    metrics.lightLevel >= MIN_LIGHT_LEVEL ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  Light: {metrics.lightLevel >= MIN_LIGHT_LEVEL ? 'Good' : 'Low'}
                </div>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-1 ${
                    metrics.fps >= 30 ? 'bg-green-500' : 'bg-orange-500'
                  }`}></div>
                  {metrics.fps.toFixed(0)} FPS
                </div>
              </div>
              
              {!isOnline && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800 text-xs">
                    ⚠️ Offline mode - attendance will sync when connected
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics Modal */}
      <ScannerDiagnostics 
        isVisible={showDiagnostics} 
        onClose={() => setShowDiagnostics(false)} 
      />
    </>
  );
};