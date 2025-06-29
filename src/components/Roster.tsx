import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Edit3, 
  Trash2,
  Save,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import Swal from 'sweetalert2';

interface RosterEntry {
  id: string;
  employee_id: string;
  date: string;
  shift_start: string;
  shift_end: string;
  break_duration: number;
  employees: {
    first_name: string;
    last_name: string;
  };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

export const Roster: React.FC = () => {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RosterEntry | null>(null);

  useEffect(() => {
    fetchEmployees();
    fetchRoster();
  }, [selectedWeek]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchRoster = async () => {
    try {
      const weekStart = format(startOfWeek(new Date(selectedWeek)), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(selectedWeek)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('rosters')
        .select(`
          *,
          employees(first_name, last_name)
        `)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date', { ascending: true });

      if (error) throw error;
      setRoster(data || []);
    } catch (error) {
      console.error('Error fetching roster:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const weekStart = startOfWeek(new Date(selectedWeek));
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  const getRosterForEmployeeAndDate = (employeeId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return roster.find(r => r.employee_id === employeeId && r.date === dateStr);
  };

  const handleAddRoster = async (formData: FormData) => {
    try {
      const employeeId = formData.get('employeeId') as string;
      const date = formData.get('date') as string;
      const shiftStart = formData.get('shiftStart') as string;
      const shiftEnd = formData.get('shiftEnd') as string;
      const breakDuration = parseInt(formData.get('breakDuration') as string) || 60;

      const { error } = await supabase
        .from('rosters')
        .insert({
          employee_id: employeeId,
          date,
          shift_start: shiftStart,
          shift_end: shiftEnd,
          break_duration: breakDuration,
        });

      if (error) throw error;

      await fetchRoster();
      setShowAddModal(false);

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Roster entry added successfully',
        confirmButtonColor: '#10B981',
      });
    } catch (error: any) {
      console.error('Error adding roster:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add roster entry',
        confirmButtonColor: '#EF4444',
      });
    }
  };

  const handleUpdateRoster = async (formData: FormData) => {
    if (!editingEntry) return;

    try {
      const shiftStart = formData.get('shiftStart') as string;
      const shiftEnd = formData.get('shiftEnd') as string;
      const breakDuration = parseInt(formData.get('breakDuration') as string) || 60;

      const { error } = await supabase
        .from('rosters')
        .update({
          shift_start: shiftStart,
          shift_end: shiftEnd,
          break_duration: breakDuration,
        })
        .eq('id', editingEntry.id);

      if (error) throw error;

      await fetchRoster();
      setEditingEntry(null);

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Roster entry updated successfully',
        confirmButtonColor: '#10B981',
      });
    } catch (error: any) {
      console.error('Error updating roster:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update roster entry',
        confirmButtonColor: '#EF4444',
      });
    }
  };

  const handleDeleteRoster = async (entry: RosterEntry) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Delete this roster entry?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete',
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('rosters')
          .delete()
          .eq('id', entry.id);

        if (error) throw error;

        await fetchRoster();

        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Roster entry has been deleted',
          confirmButtonColor: '#10B981',
        });
      } catch (error) {
        console.error('Error deleting roster:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete roster entry',
          confirmButtonColor: '#EF4444',
        });
      }
    }
  };

  const calculateWorkingHours = (start: string, end: string, breakDuration: number) => {
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(0, diffHours - (breakDuration / 60));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Roster Management
            </h1>
            <p className="text-gray-600">
              Schedule and manage employee work shifts
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <input
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Shift
            </button>
          </div>
        </div>

        {/* Roster Grid */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-teal-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-teal-900">
                    Employee
                  </th>
                  {getWeekDays().map((day) => (
                    <th key={day.toISOString()} className="px-4 py-4 text-center text-sm font-medium text-teal-900 min-w-[140px]">
                      <div>{format(day, 'EEE')}</div>
                      <div className="text-xs text-teal-600">{format(day, 'MMM dd')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-teal-100 rounded-full flex items-center justify-center">
                          <span className="text-teal-600 font-medium">
                            {employee.first_name[0]}{employee.last_name[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.first_name} {employee.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    {getWeekDays().map((day) => {
                      const rosterEntry = getRosterForEmployeeAndDate(employee.id, day);
                      const workingHours = rosterEntry 
                        ? calculateWorkingHours(rosterEntry.shift_start, rosterEntry.shift_end, rosterEntry.break_duration)
                        : 0;

                      return (
                        <td key={`${employee.id}-${day.toISOString()}`} className="px-4 py-4 text-center">
                          {rosterEntry ? (
                            <div className="bg-teal-50 rounded-lg p-2 text-xs">
                              <div className="font-medium text-teal-900">
                                {rosterEntry.shift_start} - {rosterEntry.shift_end}
                              </div>
                              <div className="text-teal-600 mt-1">
                                {workingHours.toFixed(1)}h
                              </div>
                              <div className="flex justify-center space-x-1 mt-2">
                                <button
                                  onClick={() => setEditingEntry(rosterEntry)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Edit"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRoster(rosterEntry)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-400 text-xs">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Roster Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Add Roster Entry</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleAddRoster(new FormData(e.currentTarget));
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee
                      </label>
                      <select
                        name="employeeId"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="">Select Employee</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        name="date"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Shift Start
                        </label>
                        <input
                          type="time"
                          name="shiftStart"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Shift End
                        </label>
                        <input
                          type="time"
                          name="shiftEnd"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Break Duration (minutes)
                      </label>
                      <input
                        type="number"
                        name="breakDuration"
                        defaultValue="60"
                        min="0"
                        max="480"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Add Entry
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Roster Modal */}
        {editingEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Edit Roster Entry</h3>
                  <button
                    onClick={() => setEditingEntry(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateRoster(new FormData(e.currentTarget));
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee
                      </label>
                      <input
                        type="text"
                        value={`${editingEntry.employees.first_name} ${editingEntry.employees.last_name}`}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={editingEntry.date}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Shift Start
                        </label>
                        <input
                          type="time"
                          name="shiftStart"
                          defaultValue={editingEntry.shift_start}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Shift End
                        </label>
                        <input
                          type="time"
                          name="shiftEnd"
                          defaultValue={editingEntry.shift_end}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Break Duration (minutes)
                      </label>
                      <input
                        type="number"
                        name="breakDuration"
                        defaultValue={editingEntry.break_duration}
                        min="0"
                        max="480"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setEditingEntry(null)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Update Entry
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};