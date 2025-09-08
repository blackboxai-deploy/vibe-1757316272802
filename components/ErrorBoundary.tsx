import React, { Component, ErrorInfo, ReactNode } from 'react';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
    
    // In production, you might want to send this to an error reporting service
    if (import.meta.env.MODE === 'production') {
      // Example: sendToErrorReporting(error, errorInfo);
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg-light dark:bg-brand-bg p-4">
          <Card className="max-w-2xl w-full">
            <div className="text-center space-y-6">
              <div className="text-red-500 dark:text-red-400">
                <svg 
                  className="mx-auto h-16 w-16" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" 
                  />
                </svg>
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-brand-text-light dark:text-brand-text mb-2">
                  Something went wrong
                </h1>
                <p className="text-brand-text-secondary-light dark:text-brand-text-secondary">
                  We encountered an unexpected error. This has been logged and we'll investigate the issue.
                </p>
              </div>

              {import.meta.env.MODE === 'development' && this.state.error && (
                <details className="text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <summary className="cursor-pointer font-semibold text-red-800 dark:text-red-200 mb-2">
                    Error Details (Development Mode)
                  </summary>
                  <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap overflow-auto max-h-96">
                    <strong>Error:</strong> {this.state.error.message}
                    {'\n\n'}
                    <strong>Stack:</strong> {this.state.error.stack}
                    {this.state.errorInfo && (
                      <>
                        {'\n\n'}
                        <strong>Component Stack:</strong> {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  variant="primary" 
                  onClick={this.handleReset}
                  aria-label="Try to recover from the error"
                >
                  Try Again
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={this.handleReload}
                  aria-label="Reload the entire page"
                >
                  Reload Page
                </Button>
              </div>

              <p className="text-sm text-brand-text-secondary-light dark:text-brand-text-secondary">
                If the problem persists, please contact support with the error details above.
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ErrorBoundary;