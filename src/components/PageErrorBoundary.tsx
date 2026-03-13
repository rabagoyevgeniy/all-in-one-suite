import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PageErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(`[PageError: ${this.props.pageName}]`, error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-4 py-6 flex items-center justify-center min-h-[60vh]">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full text-center shadow-sm space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle size={22} className="text-destructive" />
            </div>
            <h3 className="font-display font-bold text-base text-foreground">Page Error</h3>
            {this.props.pageName && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{this.props.pageName}</span> failed to load
              </p>
            )}
            <p className="text-sm text-muted-foreground">Something went wrong on this page.</p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-[10px] text-left bg-muted rounded-lg p-2 overflow-auto max-h-24 text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
