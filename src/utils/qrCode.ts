import QRCodeGenerator from 'qrcode-generator'

export const generateQRCode = (employeeId: string): string => {
  const qr = QRCodeGenerator(0, 'M')
  qr.addData(`EMP_${employeeId}_${Date.now()}`)
  qr.make()
  return qr.createDataURL(8, 4)
}

export const generateUniqueEmployeeCode = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}