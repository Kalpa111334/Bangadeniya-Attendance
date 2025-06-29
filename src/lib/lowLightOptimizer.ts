// Low-Light Camera Optimization and Enhancement
export class LowLightOptimizer {
  private static instance: LowLightOptimizer;
  private currentStream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private lightLevel: number = 0;
  private flashEnabled: boolean = false;

  private constructor() {}

  static getInstance(): LowLightOptimizer {
    if (!LowLightOptimizer.instance) {
      LowLightOptimizer.instance = new LowLightOptimizer();
    }
    return LowLightOptimizer.instance;
  }

  async optimizeForLowLight(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.currentStream) return;

    try {
      this.videoTrack = this.currentStream.getVideoTracks()[0];
      if (!this.videoTrack) return;

      const capabilities = this.videoTrack.getCapabilities();
      const settings: any = {};

      // Auto-exposure optimization
      if (capabilities.exposureMode) {
        if (capabilities.exposureMode.includes('manual')) {
          settings.exposureMode = 'manual';
          // Set higher exposure for low light
          if (capabilities.exposureCompensation) {
            settings.exposureCompensation = capabilities.exposureCompensation.max || 2;
          }
        } else if (capabilities.exposureMode.includes('continuous')) {
          settings.exposureMode = 'continuous';
        }
      }

      // ISO/Sensitivity optimization
      if (capabilities.iso) {
        settings.iso = capabilities.iso.max || 800; // Higher ISO for low light
      }

      // Focus optimization for low light
      if (capabilities.focusMode) {
        if (capabilities.focusMode.includes('continuous')) {
          settings.focusMode = 'continuous';
        }
      }

      // White balance for artificial lighting
      if (capabilities.whiteBalanceMode) {
        if (capabilities.whiteBalanceMode.includes('manual')) {
          settings.whiteBalanceMode = 'manual';
          if (capabilities.colorTemperature) {
            settings.colorTemperature = 3200; // Warm light compensation
          }
        }
      }

      // Apply optimizations
      if (Object.keys(settings).length > 0) {
        await this.videoTrack.applyConstraints({ advanced: [settings] });
      }

      // Apply CSS filters for additional enhancement
      this.applyVideoEnhancements(videoElement);

    } catch (error) {
      console.warn('Could not apply low-light optimizations:', error);
    }
  }

  private applyVideoEnhancements(videoElement: HTMLVideoElement): void {
    // CSS filters for contrast and brightness enhancement
    const filters = [
      'contrast(1.3)',      // Increase contrast
      'brightness(1.2)',    // Slight brightness boost
      'saturate(1.1)',      // Enhance colors
      'sepia(0.05)',        // Slight warmth for artificial lighting
    ];

    videoElement.style.filter = filters.join(' ');
    videoElement.style.imageRendering = 'optimizeQuality';
  }

  async enableFlash(): Promise<boolean> {
    if (!this.videoTrack) return false;

    try {
      const capabilities = this.videoTrack.getCapabilities();
      if (capabilities.torch) {
        await this.videoTrack.applyConstraints({
          advanced: [{ torch: true }]
        });
        this.flashEnabled = true;
        return true;
      }
    } catch (error) {
      console.warn('Could not enable flash:', error);
    }
    return false;
  }

  async disableFlash(): Promise<void> {
    if (!this.videoTrack || !this.flashEnabled) return;

    try {
      await this.videoTrack.applyConstraints({
        advanced: [{ torch: false }]
      });
      this.flashEnabled = false;
    } catch (error) {
      console.warn('Could not disable flash:', error);
    }
  }

  async detectLightLevel(videoElement: HTMLVideoElement): Promise<number> {
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
        this.lightLevel = avgBrightness;
        resolve(avgBrightness);
      } catch (error) {
        console.warn('Could not detect light level:', error);
        resolve(50);
      }
    });
  }

  isLowLight(): boolean {
    return this.lightLevel < 30; // Threshold for low light (roughly 5 lux equivalent)
  }

  getCurrentLightLevel(): number {
    return this.lightLevel;
  }

  setCurrentStream(stream: MediaStream): void {
    this.currentStream = stream;
  }

  cleanup(): void {
    if (this.flashEnabled) {
      this.disableFlash();
    }
    this.currentStream = null;
    this.videoTrack = null;
    this.lightLevel = 0;
    this.flashEnabled = false;
  }
}

export const lowLightOptimizer = LowLightOptimizer.getInstance();