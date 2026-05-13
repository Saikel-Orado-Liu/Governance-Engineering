import { Component, ErrorInfo, ReactNode } from 'react';
import type { IntlShape } from 'react-intl';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  intl?: IntlShape;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const intl = this.props.intl;
      const title = intl ? intl.formatMessage({ id: 'error.something_went_wrong' }) : 'Something went wrong';
      const message = this.state.error?.message || (intl
        ? intl.formatMessage({ id: 'common.unknown_error' })
        : 'An unexpected error occurred.');
      const retryText = intl ? intl.formatMessage({ id: 'error.try_again' }) : 'Try Again';

      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.message}>{message}</p>
            <button
              className={styles.retryButton}
              onClick={this.handleRetry}
              type="button"
            >
              {retryText}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
