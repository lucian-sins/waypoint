import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleCopy = () => {
    const errorDetails = [
      `Error: ${this.state.error?.message || 'Unknown error'}`,
      `Stack: ${this.state.error?.stack || 'No stack'}`,
      `Component Stack: ${this.state.errorInfo?.componentStack || 'No component stack'}`,
      `Timestamp: ${new Date().toISOString()}`,
      `User Agent: ${navigator.userAgent}`,
    ].join('\n\n');

    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#191b22] text-neutral-900 dark:text-neutral-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#232733] border border-black/[0.08] dark:border-white/[0.1] rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Interface Notice
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                A UI rendering error occurred. Your router routing rules and tunnels remain fully active and unaffected.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left p-3 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-black/[0.05] dark:border-white/[0.05] overflow-x-auto max-h-32 text-[11px] font-mono text-neutral-700 dark:text-neutral-300">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload App</span>
              </button>

              <button
                onClick={this.handleCopy}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold bg-neutral-200/70 hover:bg-neutral-300/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 flex items-center gap-2 cursor-pointer transition-colors"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Error</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
