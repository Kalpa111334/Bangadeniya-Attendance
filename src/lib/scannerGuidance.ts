// Scanner Guidance and Error Handling System
export class ScannerGuidance {
  private static instance: ScannerGuidance;
  private currentDistance: number = 0;
  private optimalDistance: number = 30; // cm
  private scanningStatus: string = 'idle';
  private guidanceCallbacks: ((guidance: any) => void)[] = [];

  private constructor() {}

  static getInstance(): ScannerGuidance {
    if (!ScannerGuidance.instance) {
      ScannerGuidance.instance = new ScannerGuidance();
    }
    return ScannerGuidance.instance;
  }

  estimateDistance(videoElement: HTMLVideoElement, qrCodeSize?: number): number {
    // Estimate distance based on QR code size in frame
    // This is a simplified estimation
    if (!qrCodeSize) {
      return this.currentDistance;
    }

    const frameWidth = videoElement.videoWidth;
    const assumedRealQRSize = 3; // Assume 3cm QR code
    const focalLength = frameWidth; // Simplified focal length

    this.currentDistance = (assumedRealQRSize * focalLength) / qrCodeSize;
    return this.currentDistance;
  }

  getDistanceGuidance(): string {
    if (this.currentDistance === 0) {
      return 'Position QR code in frame';
    }

    if (this.currentDistance < 10) {
      return 'Move device further away';
    } else if (this.currentDistance > 50) {
      return 'Move device closer';
    } else if (this.currentDistance < 20) {
      return 'Move slightly further away';
    } else if (this.currentDistance > 40) {
      return 'Move slightly closer';
    } else {
      return 'Perfect distance - hold steady';
    }
  }

  getLightingGuidance(lightLevel: number): string {
    if (lightLevel < 10) {
      return 'Very low light - enable flash or move to brighter area';
    } else if (lightLevel < 30) {
      return 'Low light detected - consider enabling flash';
    } else if (lightLevel > 200) {
      return 'Very bright - avoid direct sunlight';
    } else if (lightLevel > 150) {
      return 'Good lighting - avoid shadows on QR code';
    } else {
      return 'Good lighting conditions';
    }
  }

  getStabilityGuidance(motionLevel: number): string {
    if (motionLevel > 0.8) {
      return 'Device moving too much - hold steady';
    } else if (motionLevel > 0.5) {
      return 'Slight movement detected - try to hold steadier';
    } else {
      return 'Device stable - good for scanning';
    }
  }

  getAngleGuidance(angle: number): string {
    if (Math.abs(angle) > 30) {
      return 'QR code at steep angle - position more directly';
    } else if (Math.abs(angle) > 15) {
      return 'Slight angle detected - adjust position';
    } else {
      return 'Good angle for scanning';
    }
  }

  updateScanningStatus(status: 'idle' | 'scanning' | 'processing' | 'success' | 'error'): void {
    this.scanningStatus = status;
    this.notifyGuidanceUpdate();
  }

  getStatusMessage(): string {
    switch (this.scanningStatus) {
      case 'idle':
        return 'Ready to scan - position QR code in frame';
      case 'scanning':
        return 'Scanning... hold steady';
      case 'processing':
        return 'Processing QR code...';
      case 'success':
        return 'QR code detected successfully!';
      case 'error':
        return 'Scan failed - try again';
      default:
        return 'Ready to scan';
    }
  }

  getComprehensiveGuidance(
    lightLevel: number,
    motionLevel: number = 0,
    angle: number = 0
  ): any {
    return {
      distance: {
        current: this.currentDistance,
        optimal: this.optimalDistance,
        guidance: this.getDistanceGuidance()
      },
      lighting: {
        level: lightLevel,
        guidance: this.getLightingGuidance(lightLevel),
        needsFlash: lightLevel < 30
      },
      stability: {
        level: motionLevel,
        guidance: this.getStabilityGuidance(motionLevel)
      },
      angle: {
        current: angle,
        guidance: this.getAngleGuidance(angle)
      },
      status: {
        current: this.scanningStatus,
        message: this.getStatusMessage()
      },
      overall: this.getOverallGuidance(lightLevel, motionLevel, angle)
    };
  }

  private getOverallGuidance(lightLevel: number, motionLevel: number, angle: number): string {
    const issues = [];

    if (lightLevel < 30) issues.push('lighting');
    if (motionLevel > 0.5) issues.push('stability');
    if (Math.abs(angle) > 15) issues.push('angle');
    if (this.currentDistance < 10 || this.currentDistance > 50) issues.push('distance');

    if (issues.length === 0) {
      return 'Optimal conditions for scanning';
    } else if (issues.length === 1) {
      return `Adjust ${issues[0]} for better scanning`;
    } else {
      return `Adjust ${issues.slice(0, -1).join(', ')} and ${issues[issues.length - 1]}`;
    }
  }

  onGuidanceUpdate(callback: (guidance: any) => void): void {
    this.guidanceCallbacks.push(callback);
  }

  private notifyGuidanceUpdate(): void {
    const guidance = this.getComprehensiveGuidance(0); // Will be updated with real values
    this.guidanceCallbacks.forEach(callback => callback(guidance));
  }

  getErrorSolutions(errorType: string): string[] {
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
      ],
      'OverconstrainedError': [
        'Try lower quality settings',
        'Switch to a different camera',
        'Update your browser to the latest version',
        'Use a different device if available'
      ],
      'low_light': [
        'Move to a brighter area',
        'Enable device flash if available',
        'Use additional lighting source',
        'Clean camera lens for better light capture'
      ],
      'motion_blur': [
        'Hold device steadier',
        'Use both hands to stabilize',
        'Lean against a wall or surface for support',
        'Take a moment to steady yourself before scanning'
      ],
      'distance_too_far': [
        'Move device closer to QR code',
        'Ensure QR code fills about 1/3 of the frame',
        'Check if QR code is clearly visible',
        'Try zooming in if your device supports it'
      ],
      'distance_too_close': [
        'Move device further from QR code',
        'Ensure entire QR code is visible in frame',
        'Allow some margin around the QR code',
        'Step back until QR code is clearly framed'
      ]
    };

    return solutions[errorType] || [
      'Try scanning again',
      'Check QR code quality',
      'Ensure good lighting',
      'Hold device steady'
    ];
  }

  cleanup(): void {
    this.guidanceCallbacks = [];
    this.currentDistance = 0;
    this.scanningStatus = 'idle';
  }
}

export const scannerGuidance = ScannerGuidance.getInstance();