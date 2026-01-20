import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstallNudgeProps {
  show: boolean;
  isIOS: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallNudge({ show, isIOS, onInstall, onDismiss }: InstallNudgeProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          data-testid="pwa-install-nudge"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
        >
          <div className="relative rounded-xl border border-border bg-card p-4 shadow-lg">
            {/* Dismiss button */}
            <button
              data-testid="pwa-install-dismiss"
              onClick={onDismiss}
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pr-8">
              <h3 className="font-semibold text-foreground">Add The Dashboard</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep it one tap away for quick re-entry.
              </p>
            </div>

            {isIOS ? (
              <IOSInstructions />
            ) : (
              <div className="mt-4 flex gap-2">
                <Button
                  data-testid="pwa-install-cta"
                  onClick={onInstall}
                  size="sm"
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Add to Home Screen
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-muted-foreground"
                >
                  Not now
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IOSInstructions() {
  return (
    <div data-testid="pwa-ios-instructions" className="mt-4">
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <Share className="h-4 w-4 shrink-0" />
        <span>
          Tap <strong className="text-foreground">Share</strong>, then{' '}
          <strong className="text-foreground">"Add to Home Screen"</strong>
        </span>
      </div>
    </div>
  );
}
