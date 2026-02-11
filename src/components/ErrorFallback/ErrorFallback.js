import React from 'react'
import {
  CButton,
  CCol,
  CContainer,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilReload, cilHome, cilWarning } from '@coreui/icons'

const ErrorFallback = ({ onRetry, onGoHome }) => {
  const handleRetry = () => {
    if (typeof onRetry === 'function') {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  const handleGoHome = () => {
    if (typeof onGoHome === 'function') {
      onGoHome()
    } else {
      window.location.hash = '#/'
      window.location.reload()
    }
  }

  return (
    <div
      className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center"
      role="alert"
      aria-live="assertive"
    >
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6} className="text-center">
            <div className="clearfix">
              <div className="mb-4">
                <CIcon
                  icon={cilWarning}
                  size="3xl"
                  className="text-warning"
                  style={{ width: '4rem', height: '4rem' }}
                />
              </div>
              <h1 className="display-5 fw-semibold mb-2">Something went wrong</h1>
              <p className="text-body-secondary mb-4">
                We're sorry, but something unexpected happened. Please try again or go back to the home page.
              </p>
            </div>
            <div className="d-flex gap-2 justify-content-center flex-wrap">
              <CButton color="primary" onClick={handleRetry} className="d-inline-flex align-items-center gap-2">
                <CIcon icon={cilReload} />
                Reload page
              </CButton>
              <CButton color="secondary" variant="outline" onClick={handleGoHome} className="d-inline-flex align-items-center gap-2">
                <CIcon icon={cilHome} />
                Go to home
              </CButton>
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default ErrorFallback
