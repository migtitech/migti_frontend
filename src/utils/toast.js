import toast from 'react-hot-toast'

const defaultOptions = {
  duration: 4000,
  position: 'top-right',
}

/**
 * Show a success toast
 * @param {string} message - Message to display
 */
export const toastSuccess = (message = 'Success') => {
  return toast.success(message, defaultOptions)
}

/**
 * Show an error/failure toast
 * @param {string} message - Error message to display
 */
export const toastError = (message = 'Something went wrong') => {
  return toast.error(message, { ...defaultOptions, duration: 5000 })
}

/**
 * Show a pending/loading toast (returns id for dismissal)
 * @param {string} message - Loading message to display
 * @returns {string} Toast id - pass to toastSuccess/toastError/toast.dismiss() to update/dismiss
 */
export const toastPending = (message = 'Loading...') => {
  return toast.loading(message, defaultOptions)
}

/**
 * Show an info toast
 * @param {string} message - Info message to display
 */
export const toastInfo = (message = 'Info') => {
  return toast(message, {
    ...defaultOptions,
    icon: 'ℹ️',
    style: { background: '#0d6efd', color: '#fff' },
  })
}

/** Dismiss a toast by id (e.g. from toastPending) */
export const toastDismiss = (id) => toast.dismiss(id)
