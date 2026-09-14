import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Rendering Error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-background text-foreground">
          <div className="bg-card border border-destructive/30 rounded-2xl p-8 max-w-md w-full text-center shadow-lift space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20 shadow-sm">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">حدث خطأ تقني غير متوقع</h2>
              <p className="text-xs text-muted-foreground mt-1">
                واجه النظام مشكلة أثناء عرض هذا الجزء من الواجهة. تم تسجيل الخطأ بأمان.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 bg-secondary/60 rounded-xl text-left font-mono text-[11px] text-muted-foreground overflow-x-auto max-h-24">
                  {typeof this.state.error === 'object' ? (this.state.error.message || JSON.stringify(this.state.error)) : String(this.state.error)}
                </div>
              )}
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={this.handleReset}
              leftIcon={<RotateCcw className="w-4 h-4" />}
              className="w-full"
            >
              إعادة تحميل الصفحة
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
