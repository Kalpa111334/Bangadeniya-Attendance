import Swal from 'sweetalert2'

export const showSuccessAlert = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true
  })
}

export const showErrorAlert = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: '#EF4444'
  })
}

export const showConfirmAlert = (title: string, text: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3B82F6',
    cancelButtonColor: '#EF4444',
    confirmButtonText: 'Yes, proceed!'
  })
}

export const showLoadingAlert = (title: string) => {
  return Swal.fire({
    title,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading()
    }
  })
}