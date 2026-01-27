import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimeoutWarningProps {
  /** The context/module that timed out */
  context?: string;
  /** Custom message to display */
  message?: string;
  /** Optional retry handler */
  onRetry?: () => void;
  /** Whether to show inline (smaller) or block (larger) style */
  variant?: "inline" | "block";
}

/**
 * A warning component displayed when a loading state exceeds the timeout threshold.
 * Provides user feedback and optional retry functionality.
 */
export function TimeoutWarning({
  context,
  message,
  onRetry,
  variant = "block",
}: TimeoutWarningProps) {
  const defaultMessage = context
    ? `${context} is taking longer than expected.`
    : "This is taking longer than expected.";

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{message || defaultMessage}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="underline hover:no-underline ml-1"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <AlertCircle className="w-5 h-5" />
        <span className="font-medium">Something got stuck</span>
      </div>
      <p className="text-sm text-amber-700 dark:text-amber-300 text-center">
        {message || defaultMessage}
        <br />
        <span className="text-muted-foreground">Your progress is saved. Please retry.</span>
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}
