import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Fast loading simulation - complete in 1.5 seconds
    const totalDuration = 1500; // 1.5 seconds
    const updateInterval = 50; // Update every 50ms
    const incrementValue = (100 / totalDuration) * updateInterval;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + incrementValue;
        
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          
          // Start fade out transition
          setTimeout(() => {
            setFadeOut(true);
            
            // Complete after fade transition
            setTimeout(() => {
              setIsVisible(false);
              onComplete();
            }, 300); // 300ms fade out
          }, 100); // Small delay before fade
          
          return 100;
        }
        
        return newProgress;
      });
    }, updateInterval);

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%)'
      }}
    >
      <div className="text-center text-white max-w-sm mx-auto px-6">
        {/* Optimized Logo - Pure CSS */}
        <div className="mb-8">
          <div className="relative w-20 h-20 mx-auto mb-4">
            {/* Outer ring with subtle animation */}
            <div className="absolute inset-0 rounded-full bg-white bg-opacity-20 animate-pulse"></div>
            
            {/* Inner circle */}
            <div className="absolute inset-2 rounded-full bg-white bg-opacity-30 flex items-center justify-center">
              <Clock className="h-8 w-8 text-white" />
            </div>
            
            {/* Progress ring */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="white"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                className="transition-all duration-100 ease-out"
              />
            </svg>
          </div>
          
          {/* Brand Name */}
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">
            AttendanceHub
          </h1>
          <p className="text-blue-100 text-sm opacity-90">
            Employee Management System
          </p>
        </div>

        {/* Minimal Progress Indicator */}
        <div className="w-full max-w-xs mx-auto">
          {/* Progress Bar */}
          <div className="bg-white bg-opacity-20 rounded-full h-1 mb-3 overflow-hidden">
            <div 
              className="bg-white h-full rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Progress Text */}
          <p className="text-white text-opacity-90 text-sm font-medium">
            {progress < 30 ? 'Initializing...' :
             progress < 60 ? 'Loading...' :
             progress < 90 ? 'Almost ready...' :
             'Ready!'}
          </p>
        </div>

        {/* Essential Features - Minimal */}
        <div className="mt-8 grid grid-cols-2 gap-3 text-xs text-white text-opacity-75">
          <div className="flex items-center justify-center">
            <div className="w-2 h-2 bg-white bg-opacity-60 rounded-full mr-2"></div>
            QR Scanning
          </div>
          <div className="flex items-center justify-center">
            <div className="w-2 h-2 bg-white bg-opacity-60 rounded-full mr-2"></div>
            Real-time Tracking
          </div>
        </div>
      </div>
    </div>
  );
};