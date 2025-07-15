import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  QrCode, 
  Users, 
  FileText, 
  Settings,
  Clock,
  Menu,
  X
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'blue' },
    { id: 'scanner', label: 'QR Scanner', icon: QrCode, color: 'green' },
    { id: 'employees', label: 'Employees', icon: Users, color: 'purple' },
    { id: 'reports', label: 'Reports', icon: FileText, color: 'orange' },
    { id: 'roster', label: 'Roster', icon: Clock, color: 'teal' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'gray' },
  ];

  const getTabColor = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'blue': return 'bg-blue-600 text-white';
        case 'green': return 'bg-green-600 text-white';
        case 'purple': return 'bg-purple-600 text-white';
        case 'orange': return 'bg-orange-600 text-white';
        case 'teal': return 'bg-teal-600 text-white';
        case 'gray': return 'bg-gray-600 text-white';
        default: return 'bg-blue-600 text-white';
      }
    } else {
      return 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200';
    }
  };

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-white shadow-lg border-b sticky top-0 z-40">
        <div className="container-responsive">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <div className="flex items-center">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-2" />
                <span className="text-lg sm:text-xl font-bold text-gray-900">
                  AttendanceHub
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <div className="hidden lg:flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`nav-item ${getTabColor(tab.color, isActive)}`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tablet Navigation Dropdown */}
            <div className="hidden sm:block lg:hidden">
              <select
                value={activeTab}
                onChange={(e) => handleTabChange(e.target.value)}
                className="input-field text-sm min-w-[140px]"
                title="Navigation menu"
                aria-label="Navigation menu"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Menu Button */}
            <div className="sm:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="btn-secondary p-2"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed inset-x-0 top-0 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center">
                <Clock className="h-6 w-6 text-blue-600 mr-2" />
                <span className="text-lg font-bold text-gray-900">
                  AttendanceHub
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn-secondary p-2"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Navigation Items */}
            <div className="p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full nav-item justify-start ${getTabColor(tab.color, isActive)}`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <span className="text-base">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg sm:hidden z-30">
        <div className="grid grid-cols-3 gap-1 p-2">
          {tabs.slice(0, 3).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 min-h-[3.5rem] ${
                  isActive 
                    ? getTabColor(tab.color, true)
                    : 'text-gray-500 hover:text-gray-700 active:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Secondary tabs accessible via swipe or additional menu */}
        <div className="border-t border-gray-100 px-2 py-1">
          <div className="flex justify-center space-x-4">
            {tabs.slice(3).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center px-3 py-1 rounded-full text-xs transition-all duration-200 ${
                    isActive 
                      ? getTabColor(tab.color, true)
                      : 'text-gray-500 hover:text-gray-700 active:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};