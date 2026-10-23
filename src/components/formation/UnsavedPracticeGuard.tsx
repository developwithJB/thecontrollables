import { usePracticeExitConfirmation } from "@/hooks/usePracticeExitConfirmation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
export function UnsavedPracticeGuard({ dirty }: { dirty: boolean }) {
  const { register } = usePracticeExitConfirmation();
  const [accountActionPending, setAccountActionPending] = useState(false);
  const pendingAnswer = useRef<((confirmed: boolean) => void) | null>(null);
  const exitConfirmed = useRef(false);
  useEffect(() => {
    exitConfirmed.current = false;
    return register({ confirm: async () => {
      if (!dirty) return true;
      return new Promise<boolean>(resolve => {
        pendingAnswer.current?.(false);
        pendingAnswer.current = resolve;
        setAccountActionPending(true);
      });
    }, reset: () => { exitConfirmed.current = false; } });
  }, [dirty, register]);
  useEffect(() => () => { pendingAnswer.current?.(false); }, []);
  const answerAccountAction = (confirmed: boolean) => {
    exitConfirmed.current = confirmed;
    pendingAnswer.current?.(confirmed);
    pendingAnswer.current = null;
    setAccountActionPending(false);
  };
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !exitConfirmed.current &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (dirty) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      [dirty],
    ),
  );
  return (
    <AlertDialog open={accountActionPending || blocker.state === "blocked"}>
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          if (accountActionPending) answerAccountAction(false);
          else if (blocker.state === "blocked") blocker.reset();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
          <AlertDialogDescription>
            Your changes to this practice have not been saved. Stay here to save
            them, or discard these edits.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              if (accountActionPending) answerAccountAction(false);
              else if (blocker.state === "blocked") blocker.reset();
            }}
          >
            Keep editing
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (accountActionPending) answerAccountAction(true);
              else if (blocker.state === "blocked") blocker.proceed();
            }}
          >
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
