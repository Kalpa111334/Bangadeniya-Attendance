import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { QRScanner } from './components/QRScanner';
import { EmployeeManagement } from './components/EmployeeManagement';
import { Reports } from './components/Reports';
import { Roster } from './components/Roster';
import { Settings } from './components/Settings';
import { SplashScreen } from './components/SplashScreen';
import { notificationService } from './lib/notifications';
import { oneSignalService } from './lib/oneSignalService';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSplash, setShowSplash] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Initialize critical services only
    const initializeApp = async () => {
      try {
        // Initialize legacy notifications in background
        notificationService.initialize().catch(console.warn);
        
        // Initialize OneSignal push notifications
        oneSignalService.initialize().catch(console.warn);
        
        // Mark app as ready
        setAppReady(true);
      } catch (error) {
        console.warn('Non-critical initialization error:', error);
        setAppReady(true); // Continue anyway
      }
    };

    initializeApp();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'scanner') {
      setShowScanner(true);
    } else {
      setActiveTab(tab);
      setShowScanner(false);
    }
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    setActiveTab('dashboard');
  };

  // Show splash screen until ready
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'employees':
        return <EmployeeManagement />;
      case 'reports':
        return <Reports />;
      case 'roster':
        return <Roster />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
      {renderActiveComponent()}
      {showScanner && <QRScanner onClose={handleCloseScanner} />}
    </div>
  );
}

export default App;