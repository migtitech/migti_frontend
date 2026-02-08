import React from 'react'
import './Loader.scss'

const Loader = ({ message = 'Loading...', className = '' }) => {
  return (
    <div className={`loader-overlay ${className}`.trim()} role="status" aria-label="Loading">
      <div className="loader-spinner">
        <div className="loader-ring" aria-hidden="true" />
        <div className="loader-ring" aria-hidden="true" />
        <div className="loader-ring" aria-hidden="true" />
        <div className="loader-dot" aria-hidden="true" />
      </div>
      {message && <span className="loader-text">{message}</span>}
    </div>
  )
}

export default Loader
