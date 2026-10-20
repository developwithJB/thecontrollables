// @vitest-environment jsdom
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import Scripture from "@/pages/Scripture";
import { YouVersionReader } from "@/components/formation/YouVersionReader";
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    functions: { invoke: mocks.invoke },
  },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
function companion(path = "/scripture") {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(Scripture),
    ),
  );
}
const passage = {
  id: "JHN.13.1-2",
  reference: "John 13:1-2",
  text: "Synthetic source words.",
  version: "TEST",
  copyright: "Synthetic fixture attribution",
  bibleId: "999999",
  sourceUrl: "https://www.bible.com/bible/999999/JHN.13.1-2",
};
describe("Awareness Bible companion", () => {
  it("has a useful keyless fallback, three prompts and no partnership or approved-assignment claim", () => {
    companion("/scripture?reference=John%2013%3A1-17");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Read the source. Notice Jesus.",
    );
    expect(
      screen
        .getByRole("link", { name: /Read John 13:1-17 in the NLT/ })
        .getAttribute("href"),
    ).toBe("https://www.bible.com/bible/116/JHN.13.1-17");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText(/independently developed/)).toBeTruthy();
    expect(
      screen.getByText(
        /not Scripture quotations or an approved 75-day assignment/,
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Read passage here" }),
    ).toBeNull();
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("updates a Gospel reference and handles invalid input without creating a URL injection or remote call", () => {
    companion("/scripture?reference=https%3A%2F%2Fevil.invalid");
    const input = screen.getByLabelText("Gospel passage");
    fireEvent.change(input, { target: { value: "John 22:1" } });
    fireEvent.click(screen.getByRole("button", { name: "Choose passage" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "Use a Gospel passage",
    );
    fireEvent.change(input, { target: { value: "Luke 10:25-37" } });
    fireEvent.click(screen.getByRole("button", { name: "Choose passage" }));
    expect(
      screen
        .getByRole("link", { name: /Read Luke 10:25-37/ })
        .getAttribute("href"),
    ).toContain("LUK.10.25-37");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("asks signed-out readers to sign in and keeps source links independent of account creation", async () => {
    vi.stubEnv("VITE_YOUVERSION_READER_ENABLED", "true");
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    companion();
    fireEvent.click(screen.getByRole("button", { name: "Read passage here" }));
    await screen.findByText(/Sign in to use the in-app reader/);
    expect(
      screen.getByRole("link", { name: /Read Matthew 4:18-22/ }),
    ).toBeTruthy();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("fails usefully when the server gate or source is unavailable", async () => {
    vi.stubEnv("VITE_YOUVERSION_READER_ENABLED", "true");
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "synthetic" } } },
    });
    mocks.invoke.mockResolvedValue({ error: new Error("unavailable") });
    companion();
    fireEvent.click(screen.getByRole("button", { name: "Read passage here" }));
    await screen.findByText(/The in-app reader is unavailable/);
    expect(screen.queryByRole("blockquote")).toBeNull();
  });
  it("displays returned text and attribution separately from guidance and checks the selected source", async () => {
    vi.stubEnv("VITE_YOUVERSION_READER_ENABLED", "true");
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "synthetic" } } },
    });
    mocks.invoke
      .mockResolvedValueOnce({ data: { passage }, error: null })
      .mockResolvedValueOnce({
        data: { passage, verdict: "not_exact" },
        error: null,
      });
    render(createElement(YouVersionReader, { reference: "John 13:1-2" }));
    fireEvent.click(screen.getByRole("button", { name: "Read passage here" }));
    await screen.findByText(passage.copyright);
    expect(screen.getByText(passage.text)).toBeTruthy();
    fireEvent.click(screen.getByText("Check a quotation"));
    fireEvent.change(screen.getByLabelText("Full verse or range to compare"), {
      target: { value: "Synthetic changed words." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Compare with source" }),
    );
    await screen.findByText(/Not an exact match/);
    expect(mocks.invoke).toHaveBeenLastCalledWith("scripture-passage", {
      body: {
        operation: "verify_quote",
        reference: "John 13:1-2",
        quote: "Synthetic changed words.",
      },
    });
    fireEvent.change(screen.getByLabelText("Full verse or range to compare"), {
      target: { value: "another input" },
    });
    expect(screen.queryByText(/Not an exact match/)).toBeNull();
  });
  it("ignores a stale passage request after changing the reference", async () => {
    vi.stubEnv("VITE_YOUVERSION_READER_ENABLED", "true");
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "synthetic" } } },
    });
    let resolve: (value: unknown) => void;
    mocks.invoke.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const view = render(
      createElement(YouVersionReader, { reference: "John 13:1-2" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Read passage here" }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
    view.rerender(createElement(YouVersionReader, { reference: "Mark 1:1" }));
    resolve!({ data: { passage }, error: null });
    await waitFor(() => expect(screen.queryByText(passage.text)).toBeNull());
  });
});
