import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Building2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../utils/notifications'

interface Department {
  id: string
  name: string
  created_at: string
}

export const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name')

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
      showErrorAlert('Error', 'Failed to fetch departments')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDepartment = async (name: string) => {
    try {
      const { error } = await supabase
        .from('departments')
        .insert({ name })

      if (error) throw error

      showSuccessAlert('Success', 'Department added successfully')
      fetchDepartments()
      setShowAddModal(false)
    } catch (error) {
      console.error('Error adding department:', error)
      showErrorAlert('Error', 'Failed to add department')
    }
  }

  const handleDeleteDepartment = async (id: string) => {
    const result = await showConfirmAlert(
      'Delete Department',
      'Are you sure you want to delete this department? This action cannot be undone.'
    )

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('departments')
          .delete()
          .eq('id', id)

        if (error) throw error

        showSuccessAlert('Success', 'Department deleted successfully')
        fetchDepartments()
      } catch (error) {
        console.error('Error deleting department:', error)
        showErrorAlert('Error', 'Failed to delete department')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department) => (
          <div key={department.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex space-x-2">
                <button
                  title="Edit department"
                  onClick={() => setEditingDepartment(department)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  title="Delete department"
                  onClick={() => handleDeleteDepartment(department.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{department.name}</h3>
            <p className="text-sm text-gray-600">
              Created: {new Date(department.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No departments found</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-teal-600 hover:text-teal-700"
          >
            Add your first department
          </button>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddModal && (
        <AddDepartmentModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddDepartment}
        />
      )}

      {/* Edit Department Modal */}
      {editingDepartment && (
        <EditDepartmentModal
          department={editingDepartment}
          onClose={() => setEditingDepartment(null)}
          onUpdate={fetchDepartments}
        />
      )}
    </div>
  )
}

// Add Department Modal
const AddDepartmentModal: React.FC<{
  onClose: () => void
  onAdd: (name: string) => void
}> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onAdd(name.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Department</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter department name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Add Department
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Department Modal
const EditDepartmentModal: React.FC<{
  department: Department
  onClose: () => void
  onUpdate: () => void
}> = ({ department, onClose, onUpdate }) => {
  const [name, setName] = useState(department.name)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase
        .from('departments')
        .update({ name: name.trim() })
        .eq('id', department.id)

      if (error) throw error

      showSuccessAlert('Success', 'Department updated successfully')
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error updating department:', error)
      showErrorAlert('Error', 'Failed to update department')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Department</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter department name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Update Department
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}