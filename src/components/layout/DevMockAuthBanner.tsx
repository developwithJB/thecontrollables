import { AlertTriangle } from "lucide-react";
import { shouldShowDevMockAuthBanner } from "@/lib/devMockAuth";

export function DevMockAuthBanner() {
  if (!shouldShowDevMockAuthBanner()) return null;

  return (
    <div className="border-b border-amber-400/40 bg-amber-500/12 px-4 py-2 text-amber-100">
      <div className="mx-auto flex max-w-md items-center justify-center gap-2 text-xs font-semibold md:max-w-none">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Dev QA mock auth active.</span>
      </div>
    </div>
  );
}
