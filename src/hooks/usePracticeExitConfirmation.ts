import { createContext, useContext } from "react";

export type ExitGuard = { confirm: () => Promise<boolean>; reset: () => void };
export const PracticeExitContext = createContext({
  confirmExit: async () => true,
  resetExitConfirmation: () => {},
  register: (_guard: ExitGuard) => () => {},
});

export function usePracticeExitConfirmation() {
  return useContext(PracticeExitContext);
}
