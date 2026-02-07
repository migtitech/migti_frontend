import React from 'react'
import ErrorFallback from '../ErrorFallback/ErrorFallback'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === 'development' && typeof console !== 'undefined') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.hash = '#/'
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback ?? ErrorFallback
      return (
        <FallbackComponent
          error={this.state.error}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
