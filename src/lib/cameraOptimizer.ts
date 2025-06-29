// Camera Optimization Utility
export class CameraOptimizer {
  private static instance: CameraOptimizer;
  private deviceCapabilities: any = null;
  private optimalSettings: any = null;

  private constructor() {}

  static getInstance(): CameraOptimizer {
    if (!CameraOptimizer.instance) {
      CameraOptimizer.instance = new CameraOptimizer();
    }
    return CameraOptimizer.instance;
  }

  async detectDeviceCapabilities(): Promise<any> {
    if (this.deviceCapabilities) {
      return this.deviceCapabilities;
    }

    try {
      // Get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      // Test basic camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      const settings = videoTrack.getSettings();

      // Stop test stream
      stream.getTracks().forEach(track => track.stop());

      this.deviceCapabilities = {
        deviceCount: videoDevices.length,
        hasBackCamera: videoDevices.some(d => d.label.toLowerCase().includes('back')),
        hasFrontCamera: videoDevices.some(d => d.label.toLowerCase().includes('front')),
        capabilities,
        currentSettings: settings,
        supportedResolutions: this.getSupportedResolutions(capabilities),
        supportedFrameRates: this.getSupportedFrameRates(capabilities),
        hasAdvancedControls: this.hasAdvancedControls(capabilities)
      };

      return this.deviceCapabilities;
    } catch (error) {
      console.error('Error detecting device capabilities:', error);
      return {
        deviceCount: 0,
        hasBackCamera: false,
        hasFrontCamera: false,
        capabilities: {},
        supportedResolutions: ['medium'],
        supportedFrameRates: [15],
        hasAdvancedControls: false
      };
    }
  }

  private getSupportedResolutions(capabilities: any): string[] {
    const resolutions = ['low'];
    
    if (capabilities.width?.max >= 1280) {
      resolutions.push('medium');
    }
    
    if (capabilities.width?.max >= 1920) {
      resolutions.push('high');
    }

    return resolutions;
  }

  private getSupportedFrameRates(capabilities: any): number[] {
    const frameRates = [10, 15];
    
    if (capabilities.frameRate?.max >= 20) {
      frameRates.push(20);
    }
    
    if (capabilities.frameRate?.max >= 30) {
      frameRates.push(30);
    }

    return frameRates;
  }

  private hasAdvancedControls(capabilities: any): boolean {
    return !!(
      capabilities.focusMode ||
      capabilities.exposureMode ||
      capabilities.whiteBalanceMode ||
      capabilities.torch
    );
  }

  async getOptimalSettings(userPreferences: any = {}): Promise<any> {
    const capabilities = await this.detectDeviceCapabilities();
    
    // Determine optimal settings based on device capabilities
    let optimalResolution = 'medium';
    let optimalFrameRate = 15;

    // For devices with limited capabilities, use lower settings
    if (capabilities.deviceCount === 1 || !capabilities.hasAdvancedControls) {
      optimalResolution = 'low';
      optimalFrameRate = 10;
    }

    // For high-end devices, can use better settings
    if (capabilities.capabilities.width?.max >= 1920 && capabilities.capabilities.frameRate?.max >= 30) {
      optimalResolution = userPreferences.resolution || 'medium';
      optimalFrameRate = userPreferences.frameRate || 20;
    }

    this.optimalSettings = {
      facingMode: userPreferences.facingMode || 'environment',
      resolution: optimalResolution,
      frameRate: optimalFrameRate,
      enableAdvancedControls: capabilities.hasAdvancedControls,
      recommendedConstraints: this.buildOptimalConstraints(capabilities, {
        resolution: optimalResolution,
        frameRate: optimalFrameRate
      })
    };

    return this.optimalSettings;
  }

  private buildOptimalConstraints(capabilities: any, settings: any): any {
    const resolutionMap = {
      low: { width: 640, height: 480 },
      medium: { width: 1280, height: 720 },
      high: { width: 1920, height: 1080 }
    };

    const resolution = resolutionMap[settings.resolution as keyof typeof resolutionMap];

    const constraints: any = {
      video: {
        facingMode: settings.facingMode || 'environment',
        width: { ideal: resolution.width, max: resolution.width },
        height: { ideal: resolution.height, max: resolution.height },
        frameRate: { 
          ideal: settings.frameRate, 
          max: Math.min(settings.frameRate + 5, 30) 
        },
        aspectRatio: { ideal: 16/9 }
      }
    };

    // Add advanced constraints for supported devices
    if (capabilities.hasAdvancedControls) {
      constraints.video.advanced = [];

      // Focus mode
      if (capabilities.capabilities.focusMode) {
        constraints.video.advanced.push({
          focusMode: capabilities.capabilities.focusMode.includes('continuous') 
            ? 'continuous' 
            : 'single-shot'
        });
      }

      // Exposure mode
      if (capabilities.capabilities.exposureMode) {
        constraints.video.advanced.push({
          exposureMode: capabilities.capabilities.exposureMode.includes('continuous')
            ? 'continuous'
            : 'manual'
        });
      }

      // White balance
      if (capabilities.capabilities.whiteBalanceMode) {
        constraints.video.advanced.push({
          whiteBalanceMode: capabilities.capabilities.whiteBalanceMode.includes('continuous')
            ? 'continuous'
            : 'manual'
        });
      }

      // Disable torch to prevent flickering
      if (capabilities.capabilities.torch) {
        constraints.video.advanced.push({ torch: false });
      }
    }

    return constraints;
  }

  getPerformanceRecommendations(): string[] {
    const recommendations = [];

    if (!this.deviceCapabilities) {
      return ['Run device detection first'];
    }

    if (this.deviceCapabilities.deviceCount === 1) {
      recommendations.push('Single camera detected - use lower quality settings');
    }

    if (!this.deviceCapabilities.hasAdvancedControls) {
      recommendations.push('Limited camera controls - flickering may occur');
      recommendations.push('Try using consistent lighting conditions');
    }

    if (this.deviceCapabilities.capabilities.frameRate?.max < 20) {
      recommendations.push('Low frame rate support - use 10-15 FPS');
    }

    if (this.deviceCapabilities.capabilities.width?.max < 1280) {
      recommendations.push('Limited resolution support - use low quality');
    }

    return recommendations.length > 0 ? recommendations : ['Device appears to have good camera support'];
  }
}

export const cameraOptimizer = CameraOptimizer.getInstance();