import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { captureHandledException } from "@/hooks/useAnalytics";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    captureHandledException(error, {
      error_type: "react_boundary",
      component_stack: errorInfo.componentStack?.slice(0, 500),
    });
    
    // Log error to database for monitoring
    this.logError(error, errorInfo);
  }

  private async logError(error: Error, errorInfo: ErrorInfo) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("app_errors").insert({
        error_message: error.message,
        error_stack: error.stack,
        error_type: "react_boundary",
        component_name: errorInfo.componentStack?.slice(0, 500),
        user_id: user?.id,
        page_path: window.location.pathname,
        user_agent: navigator.userAgent,
      });
    } catch (logError) {
      console.error("[ErrorBoundary] Failed to log error:", logError);
    }
  }

  private handleRefresh = () => {
    // Clear any cached state that might cause the error to persist
    try {
      // Clear React Query cache
      if (typeof window !== "undefined" && (window as any).__REACT_QUERY_CLIENT__) {
        (window as any).__REACT_QUERY_CLIENT__.clear();
      }
    } catch (e) {
      console.error("[ErrorBoundary] Failed to clear cache:", e);
    }
    
    // Force full page reload
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
          <div className="flex flex-col items-center gap-6 max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Something went wrong</h1>
              <p className="text-muted-foreground">
                Your progress is saved. Please refresh to continue.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={this.handleRetry}
              >
                Try Again
              </Button>
              <Button
                onClick={this.handleRefresh}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 p-4 bg-muted rounded-lg text-left w-full">
                <summary className="cursor-pointer text-sm font-medium">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap text-destructive">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
