import { useCallback } from "react";
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
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
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
    <AlertDialog open={blocker.state === "blocked"}>
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          if (blocker.state === "blocked") blocker.reset();
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
              if (blocker.state === "blocked") blocker.reset();
            }}
          >
            Keep editing
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (blocker.state === "blocked") blocker.proceed();
            }}
          >
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
