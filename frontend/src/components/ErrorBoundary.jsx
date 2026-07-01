import { Component } from 'react';

// Catches render-time errors anywhere below it and shows a friendly fallback
// instead of a blank white screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--page-bg)', padding: 24 }}>
          <div className="card" style={{ padding: '32px 36px', textAlign: 'center', maxWidth: 440 }}>
            <h1 style={{ fontSize: 20, margin: '0 0 8px', color: 'var(--text-primary)' }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
              An unexpected error occurred while rendering this page. Reloading usually fixes it.
            </p>
            <button type="button" className="button button-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
