import { Component } from 'react';

export class ErrorBoundary extends Component {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 text-red">
          <h1 className="font-bold">Something went wrong.</h1>
          <div className="mt-1">{this.state.error.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
