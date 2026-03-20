import { Component } from 'react';
import { Error } from './Error.jsx';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error: { message: error.message || 'An unexpected error occurred.' } };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.error) {
      return <Error error={this.state.error} header={true} />;
    }
    return this.props.children;
  }
}
