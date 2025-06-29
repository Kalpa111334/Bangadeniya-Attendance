import React from 'react'
import { QRScanner } from '../components/QRScanner/QRScanner'

export const Scanner: React.FC = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">QR Code Scanner</h1>
        <p className="text-gray-600 mt-2">Scan employee QR codes for attendance tracking</p>
      </div>
      <QRScanner />
    </div>
  )
}