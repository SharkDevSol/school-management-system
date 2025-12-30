import React from 'react';
import styles from '../PAGE/Evaluation/Evaluation.module.css'; // Reuse Evaluation styles

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.promptBox} style={{ border: '1px solid red' }}>
          <p className={styles.errorMessage}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className={`${styles.button} ${styles.primary}`}
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;