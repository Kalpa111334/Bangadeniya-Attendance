import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  QrCode, 
  FileText, 
  Calendar,
  Settings,
  Building2,
  Clock
} from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', color: 'text-blue-600' },
  { icon: Users, label: 'Employees', path: '/employees', color: 'text-green-600' },
  { icon: QrCode, label: 'QR Scanner', path: '/scanner', color: 'text-purple-600' },
  { icon: Clock, label: 'Attendance', path: '/attendance', color: 'text-orange-600' },
  { icon: Building2, label: 'Departments', path: '/departments', color: 'text-teal-600' },
  { icon: Calendar, label: 'Roster', path: '/roster', color: 'text-pink-600' },
  { icon: FileText, label: 'Reports', path: '/reports', color: 'text-indigo-600' },
  { icon: Settings, label: 'Settings', path: '/settings', color: 'text-gray-600' }
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:shadow-none
      `}>
        <div className="flex items-center justify-center h-16 bg-gradient-to-r from-blue-600 to-purple-600">
          <h1 className="text-white text-xl font-bold">AttendanceHub</h1>
        </div>
        
        <nav className="mt-8 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-all duration-200
                  ${isActive 
                    ? 'bg-gray-100 border-r-4 border-blue-500 text-blue-600' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? item.color : 'text-gray-500'}`} />
                <span className={`font-medium ${isActive ? 'text-blue-600' : ''}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}