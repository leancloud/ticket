import React from 'react'
import { Alert } from 'react-bootstrap'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { error }
  }
  render() {
    const { error } = this.state
    if (error) {
      // You can render any custom fallback UI
      return <Alert variant="danger">{error.message ?? error}</Alert>
    }
    return this.props.children
  }
}
