import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  TrendingUp,
  UserCheck,
  Building2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  lateArrivals: number;
  totalHoursToday: number;
  departmentStats: Array<{
    department: string;
    present: number;
    total: number;
  }>;
  recentActivity: Array<{
    id: string;
    employee_name: string;
    action: string;
    time: string;
  }>;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    lateArrivals: 0,
    totalHoursToday: 0,
    departmentStats: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('attendance-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'attendance_records' },
        () => fetchDashboardStats()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Fetch total employees
      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      // Fetch today's attendance
      const { data: todayAttendance } = await supabase
        .from('attendance_records')
        .select(`
          *,
          employees!inner(first_name, last_name, departments(name))
        `)
        .eq('date', today);

      // Calculate stats
      const presentToday = todayAttendance?.length || 0;
      const lateArrivals = todayAttendance?.filter(record => record.is_late).length || 0;
      const totalHoursToday = todayAttendance?.reduce((sum, record) => sum + (record.total_hours || 0), 0) || 0;

      // Department stats
      const departmentMap = new Map();
      todayAttendance?.forEach(record => {
        const dept = record.employees.departments?.name || 'General';
        departmentMap.set(dept, (departmentMap.get(dept) || 0) + 1);
      });

      const departmentStats = Array.from(departmentMap.entries()).map(([department, present]) => ({
        department,
        present: present as number,
        total: present as number // Simplified - would need actual department totals
      }));

      // Recent activity
      const recentActivity = todayAttendance?.slice(-10).map(record => ({
        id: record.id,
        employee_name: `${record.employees.first_name} ${record.employees.last_name}`,
        action: getLatestAction(record),
        time: getLatestTime(record)
      })) || [];

      setStats({
        totalEmployees: totalEmployees || 0,
        presentToday,
        lateArrivals,
        totalHoursToday,
        departmentStats,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLatestAction = (record: any) => {
    if (record.second_check_out) return 'Second Check Out';
    if (record.second_check_in) return 'Second Check In';
    if (record.first_check_out) return 'First Check Out';
    if (record.first_check_in) return 'First Check In';
    return 'Unknown';
  };

  const getLatestTime = (record: any) => {
    const times = [
      record.second_check_out,
      record.second_check_in,
      record.first_check_out,
      record.first_check_in
    ].filter(Boolean);
    
    return times.length > 0 ? format(new Date(times[0]), 'HH:mm') : '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20 sm:pb-6">
      <div className="container-responsive py-responsive">
        {/* Header */}
        <div className="mb-responsive">
          <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">
            Attendance Dashboard
          </h1>
          <p className="text-responsive-sm text-gray-600">
            Real-time overview for {format(new Date(), 'MMMM dd, yyyy')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid-stats mb-responsive">
          <div className="card border-l-4 border-blue-500">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-responsive-xs font-medium text-gray-600">Total Employees</p>
                  <p className="text-responsive-xl font-bold text-gray-900">{stats.totalEmployees}</p>
                </div>
                <Users className="h-8 w-8 sm:h-12 sm:w-12 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-green-500">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-responsive-xs font-medium text-gray-600">Present Today</p>
                  <p className="text-responsive-xl font-bold text-gray-900">{stats.presentToday}</p>
                </div>
                <UserCheck className="h-8 w-8 sm:h-12 sm:w-12 text-green-500" />
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-orange-500">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-responsive-xs font-medium text-gray-600">Late Arrivals</p>
                  <p className="text-responsive-xl font-bold text-gray-900">{stats.lateArrivals}</p>
                </div>
                <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 text-orange-500" />
              </div>
            </div>
          </div>

          <div className="card border-l-4 border-purple-500">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-responsive-xs font-medium text-gray-600">Total Hours</p>
                  <p className="text-responsive-xl font-bold text-gray-900">{stats.totalHoursToday.toFixed(1)}</p>
                </div>
                <Clock className="h-8 w-8 sm:h-12 sm:w-12 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Department Stats */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 mr-2" />
                <h3 className="text-responsive-lg font-semibold text-gray-900">Department Attendance</h3>
              </div>
            </div>
            <div className="card-body">
              <div className="space-y-3 sm:space-y-4">
                {stats.departmentStats.map((dept, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded mr-3"></div>
                      <span className="text-responsive-sm text-gray-700">{dept.department}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-responsive-sm text-gray-900 font-semibold">{dept.present}</span>
                      <span className="text-responsive-xs text-gray-500 ml-1">present</span>
                    </div>
                  </div>
                ))}
                {stats.departmentStats.length === 0 && (
                  <p className="text-responsive-sm text-gray-500 text-center py-4">No department data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 mr-2" />
                <h3 className="text-responsive-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
            </div>
            <div className="card-body">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-responsive-sm font-medium text-gray-900 truncate">{activity.employee_name}</p>
                      <p className="text-responsive-xs text-gray-600">{activity.action}</p>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="text-responsive-xs font-medium text-gray-900">{activity.time}</p>
                      <p className="text-xs text-gray-500">Today</p>
                    </div>
                  </div>
                ))}
                {stats.recentActivity.length === 0 && (
                  <p className="text-responsive-sm text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};