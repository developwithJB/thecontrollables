// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, Link } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { PracticeExitProvider } from "@/components/formation/PracticeExitProvider";
import { usePracticeExitConfirmation } from "@/hooks/usePracticeExitConfirmation";
import { UnsavedPracticeGuard } from "@/components/formation/UnsavedPracticeGuard";
afterEach(cleanup);
it.each([true, false])("confirms before account mutation or cleanup (dirty=%s)", async dirty => {
  const signOut = vi.fn();
  const clear = vi.fn();
  function Editor() {
    const { confirmExit } = usePracticeExitConfirmation();
    return createElement("div", null,
      createElement(UnsavedPracticeGuard, { dirty }),
      createElement("button", { onClick: async () => { if (!(await confirmExit())) return; signOut(); clear(); } }, "Sign Out"));
  }
  const router = createMemoryRouter([{ path: "/", element: createElement(PracticeExitProvider, null, createElement(Editor)) }]);
  render(createElement(RouterProvider, { router }));
  fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));
  if (dirty) {
    await screen.findByRole("alertdialog");
    expect(signOut).not.toHaveBeenCalled(); expect(clear).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(signOut).not.toHaveBeenCalled(); expect(clear).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));
    fireEvent.click(await screen.findByRole("button", { name: "Discard changes" }));
  }
  await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  expect(clear).toHaveBeenCalledTimes(1);
});
it("restores route protection when confirmed sign-out fails", async () => {
  function Editor() {
    const { confirmExit, resetExitConfirmation } = usePracticeExitConfirmation();
    return createElement("div", null,
      createElement(UnsavedPracticeGuard, { dirty: true }),
      createElement(Link, { to: "/next" }, "Next"),
      createElement("button", { onClick: async () => { if (await confirmExit()) resetExitConfirmation(); } }, "Fail sign out"));
  }
  const router = createMemoryRouter([{ path: "/", element: createElement(PracticeExitProvider, null, createElement(Editor)) }, { path: "/next", element: "Next page" }]);
  render(createElement(RouterProvider, { router }));
  fireEvent.click(screen.getByRole("button", { name: "Fail sign out" }));
  fireEvent.click(await screen.findByRole("button", { name: "Discard changes" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  fireEvent.click(screen.getByRole("link", { name: "Next" }));
  expect(await screen.findByRole("alertdialog")).toBeTruthy();
  expect(router.state.location.pathname).toBe("/");
});
