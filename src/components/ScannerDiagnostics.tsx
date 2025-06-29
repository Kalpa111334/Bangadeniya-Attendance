import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Info, Download } from 'lucide-react';
import { cameraOptimizer } from '../lib/cameraOptimizer';
import { scannerPerformance } from '../lib/scannerPerformance';

interface ScannerDiagnosticsProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ScannerDiagnostics: React.FC<ScannerDiagnosticsProps> = ({ isVisible, onClose }) => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      runDiagnostics();
    }
  }, [isVisible]);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const capabilities = await cameraOptimizer.detectDeviceCapabilities();
      const optimalSettings = await cameraOptimizer.getOptimalSettings();
      const performanceMetrics = scannerPerformance.getPerformanceMetrics();
      const recommendations = cameraOptimizer.getPerformanceRecommendations();

      setDiagnostics({
        capabilities,
        optimalSettings,
        performanceMetrics,
        recommendations,
        browserInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        }
      });
    } catch (error) {
      console.error('Error running diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadDiagnostics = () => {
    if (!diagnostics) return;

    const data = {
      ...diagnostics,
      performanceData: scannerPerformance.exportPerformanceData(),
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scanner-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Scanner Diagnostics</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={downloadDiagnostics}
                disabled={!diagnostics}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Download className="h-4 w-4 mr-1 inline" />
                Export
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Running diagnostics...</p>
            </div>
          ) : diagnostics ? (
            <div className="space-y-6">
              {/* Performance Metrics */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Activity className="h-5 w-5 text-green-600 mr-2" />
                  Performance Metrics
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Success Rate:</span>
                    <span className={`ml-2 font-medium ${
                      diagnostics.performanceMetrics.successRate >= 80 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {diagnostics.performanceMetrics.successRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Processing:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {diagnostics.performanceMetrics.averageProcessingTime.toFixed(0)}ms
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Scans:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {diagnostics.performanceMetrics.successfulScans}/{diagnostics.performanceMetrics.scanAttempts}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Flicker Events:</span>
                    <span className={`ml-2 font-medium ${
                      diagnostics.performanceMetrics.flickerEvents > 5 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {diagnostics.performanceMetrics.flickerEvents}
                    </span>
                  </div>
                </div>
              </div>

              {/* Device Capabilities */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Info className="h-5 w-5 text-blue-600 mr-2" />
                  Device Capabilities
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Cameras:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {diagnostics.capabilities.deviceCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Back Camera:</span>
                    <span className={`ml-2 font-medium ${
                      diagnostics.capabilities.hasBackCamera ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {diagnostics.capabilities.hasBackCamera ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Advanced Controls:</span>
                    <span className={`ml-2 font-medium ${
                      diagnostics.capabilities.hasAdvancedControls ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {diagnostics.capabilities.hasAdvancedControls ? 'Yes' : 'Limited'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Max Resolution:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {diagnostics.capabilities.capabilities.width?.max || 'Unknown'}p
                    </span>
                  </div>
                </div>
              </div>

              {/* Optimal Settings */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  Recommended Settings
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Resolution:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {diagnostics.optimalSettings.resolution}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Frame Rate:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {diagnostics.optimalSettings.frameRate} FPS
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Camera:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {diagnostics.optimalSettings.facingMode === 'environment' ? 'Back' : 'Front'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Advanced Controls:</span>
                    <span className={`ml-2 font-medium ${
                      diagnostics.optimalSettings.enableAdvancedControls ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {diagnostics.optimalSettings.enableAdvancedControls ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  Recommendations
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {diagnostics.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Performance Report */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Performance Report</h4>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                  {scannerPerformance.getPerformanceReport()}
                </pre>
              </div>

              {/* Browser Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Browser Information</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Platform:</strong> {diagnostics.browserInfo.platform}</div>
                  <div><strong>Language:</strong> {diagnostics.browserInfo.language}</div>
                  <div><strong>Online:</strong> {diagnostics.browserInfo.onLine ? 'Yes' : 'No'}</div>
                  <div><strong>User Agent:</strong> {diagnostics.browserInfo.userAgent}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Click "Run Diagnostics" to analyze scanner performance</p>
              <button
                onClick={runDiagnostics}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Run Diagnostics
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};