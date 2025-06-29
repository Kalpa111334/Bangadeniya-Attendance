import React, { useRef, useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Camera, Scan, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { showSuccessAlert, showErrorAlert } from '../../utils/notifications'
import { speakWelcomeMessage } from '../../utils/voiceToSpeech'

export const QRScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false)
  const [lastScan, setLastScan] = useState<string>('')
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    if (isScanning) {
      scannerRef.current = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        false
      )

      scannerRef.current.render(
        (decodedText) => {
          handleScan(decodedText)
        },
        (error) => {
          console.log('QR scan error:', error)
        }
      )
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
      }
    }
  }, [isScanning])

  const handleScan = async (qrData: string) => {
    if (qrData === lastScan) return
    setLastScan(qrData)

    try {
      // Extract employee ID from QR code
      const employeeId = qrData.replace('EMP_', '').split('_')[0]
      
      // Get employee data
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single()

      if (empError || !employee) {
        showErrorAlert('Invalid QR Code', 'Employee not found')
        return
      }

      // Check if already checked in today
      const today = new Date().toISOString().split('T')[0]
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .single()

      const now = new Date()
      const currentTime = now.toISOString()
      const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0)

      if (existingAttendance && !existingAttendance.check_out) {
        // Check out
        const checkInTime = new Date(existingAttendance.check_in)
        const workingHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

        const { error } = await supabase
          .from('attendance')
          .update({
            check_out: currentTime,
            working_hours: Math.round(workingHours * 100) / 100
          })
          .eq('id', existingAttendance.id)

        if (error) throw error

        speakWelcomeMessage(`${employee.first_name} ${employee.last_name}`, false)
        showSuccessAlert('Check Out Successful', `Goodbye ${employee.first_name}! Working hours: ${Math.round(workingHours * 100) / 100}h`)
      } else {
        // Check in
        const { error } = await supabase
          .from('attendance')
          .insert({
            employee_id: employeeId,
            check_in: currentTime,
            date: today,
            is_late: isLate
          })

        if (error) throw error

        speakWelcomeMessage(`${employee.first_name} ${employee.last_name}`, true)
        showSuccessAlert('Check In Successful', `Welcome ${employee.first_name}!${isLate ? ' (Late arrival)' : ''}`)
      }
    } catch (error) {
      console.error('Attendance error:', error)
      showErrorAlert('Error', 'Failed to record attendance')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scan className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">QR Code Scanner</h2>
          <p className="text-gray-600">Scan employee QR codes for attendance tracking</p>
        </div>

        {!isScanning ? (
          <div className="text-center">
            <button
              onClick={() => setIsScanning(true)}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>Start Scanner</span>
            </button>
          </div>
        ) : (
          <div>
            <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsScanning(false)
                  if (scannerRef.current) {
                    scannerRef.current.clear()
                  }
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Stop Scanner
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Scanner Instructions</span>
          </div>
          <ul className="text-sm text-blue-800 mt-2 space-y-1">
            <li>• Point camera at employee QR code</li>
            <li>• Ensure good lighting for better scanning</li>
            <li>• Hold steady until scan completes</li>
            <li>• Voice confirmation will play after scan</li>
          </ul>
        </div>
      </div>
    </div>
  )
}