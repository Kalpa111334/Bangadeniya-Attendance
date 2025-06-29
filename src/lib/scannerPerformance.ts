// Scanner Performance Monitoring and Optimization
export class ScannerPerformance {
  private static instance: ScannerPerformance;
  private performanceMetrics: any = {
    scanAttempts: 0,
    successfulScans: 0,
    errorCount: 0,
    averageProcessingTime: 0,
    lastScanTime: 0,
    flickerEvents: 0,
    cameraRestarts: 0
  };
  private performanceHistory: any[] = [];

  private constructor() {}

  static getInstance(): ScannerPerformance {
    if (!ScannerPerformance.instance) {
      ScannerPerformance.instance = new ScannerPerformance();
    }
    return ScannerPerformance.instance;
  }

  recordScanAttempt(): void {
    this.performanceMetrics.scanAttempts++;
    this.performanceMetrics.lastScanTime = Date.now();
  }

  recordSuccessfulScan(processingTime: number): void {
    this.performanceMetrics.successfulScans++;
    
    // Update average processing time
    const totalScans = this.performanceMetrics.successfulScans;
    this.performanceMetrics.averageProcessingTime = 
      (this.performanceMetrics.averageProcessingTime * (totalScans - 1) + processingTime) / totalScans;

    this.addToHistory('scan_success', { processingTime });
  }

  recordError(errorType: string, errorMessage: string): void {
    this.performanceMetrics.errorCount++;
    this.addToHistory('error', { errorType, errorMessage });
  }

  recordFlickerEvent(): void {
    this.performanceMetrics.flickerEvents++;
    this.addToHistory('flicker', {});
  }

  recordCameraRestart(): void {
    this.performanceMetrics.cameraRestarts++;
    this.addToHistory('camera_restart', {});
  }

  private addToHistory(event: string, data: any): void {
    this.performanceHistory.push({
      timestamp: Date.now(),
      event,
      data
    });

    // Keep only last 100 events
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
  }

  getPerformanceMetrics(): any {
    const successRate = this.performanceMetrics.scanAttempts > 0 
      ? (this.performanceMetrics.successfulScans / this.performanceMetrics.scanAttempts) * 100 
      : 0;

    return {
      ...this.performanceMetrics,
      successRate: Math.round(successRate * 100) / 100,
      errorRate: this.performanceMetrics.scanAttempts > 0 
        ? (this.performanceMetrics.errorCount / this.performanceMetrics.scanAttempts) * 100 
        : 0
    };
  }

  getPerformanceReport(): string {
    const metrics = this.getPerformanceMetrics();
    
    let report = `Scanner Performance Report:\n`;
    report += `• Success Rate: ${metrics.successRate}%\n`;
    report += `• Average Processing Time: ${metrics.averageProcessingTime.toFixed(0)}ms\n`;
    report += `• Total Scans: ${metrics.successfulScans}/${metrics.scanAttempts}\n`;
    report += `• Errors: ${metrics.errorCount}\n`;
    report += `• Flicker Events: ${metrics.flickerEvents}\n`;
    report += `• Camera Restarts: ${metrics.cameraRestarts}\n`;

    // Performance recommendations
    if (metrics.successRate < 80) {
      report += `\n⚠️ Low success rate detected. Try:\n`;
      report += `• Better lighting conditions\n`;
      report += `• Lower camera quality settings\n`;
      report += `• Cleaning camera lens\n`;
    }

    if (metrics.flickerEvents > 5) {
      report += `\n⚠️ High flicker count. Try:\n`;
      report += `• Reducing frame rate\n`;
      report += `• Using manual camera controls\n`;
      report += `• Avoiding direct light sources\n`;
    }

    if (metrics.averageProcessingTime > 2000) {
      report += `\n⚠️ Slow processing detected. Try:\n`;
      report += `• Lower resolution settings\n`;
      report += `• Closing other apps\n`;
      report += `• Restarting the browser\n`;
    }

    return report;
  }

  reset(): void {
    this.performanceMetrics = {
      scanAttempts: 0,
      successfulScans: 0,
      errorCount: 0,
      averageProcessingTime: 0,
      lastScanTime: 0,
      flickerEvents: 0,
      cameraRestarts: 0
    };
    this.performanceHistory = [];
  }

  exportPerformanceData(): any {
    return {
      metrics: this.getPerformanceMetrics(),
      history: this.performanceHistory,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    };
  }
}

export const scannerPerformance = ScannerPerformance.getInstance();