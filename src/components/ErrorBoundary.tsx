import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-screen bg-background px-6">
          <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-sm space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle size={28} className="text-destructive" />
            </div>
            <h2 className="font-display font-bold text-lg text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">An unexpected error occurred. Please try again.</p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-[10px] text-left bg-muted rounded-lg p-3 overflow-auto max-h-32 text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { window.location.href = '/'; }}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Home size={14} /> Home
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
