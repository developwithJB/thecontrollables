import { describe, expect, it, vi } from "vitest";
import {
  applyThemePreference,
  resolveThemePreference,
  setThemePreference,
} from "@/lib/theme";

describe("theme preference", () => {
  it("defaults to dark unless the user explicitly saved light", () => {
    expect(resolveThemePreference(null)).toBe("dark");
    expect(resolveThemePreference(undefined)).toBe("dark");
    expect(resolveThemePreference("dark")).toBe("dark");
    expect(resolveThemePreference("light")).toBe("light");
  });

  it("applies the dark class from the resolved theme", () => {
    const root = { classList: { toggle: vi.fn() } };

    applyThemePreference("dark", root as never);
    applyThemePreference("light", root as never);

    expect(root.classList.toggle).toHaveBeenNthCalledWith(1, "dark", true);
    expect(root.classList.toggle).toHaveBeenNthCalledWith(2, "dark", false);
  });

  it("persists explicit user changes", () => {
    const storage = { setItem: vi.fn(), getItem: vi.fn() };
    const root = { classList: { toggle: vi.fn() } };

    setThemePreference("light", storage as never, root as never);

    expect(storage.setItem).toHaveBeenCalledWith("theme", "light");
    expect(root.classList.toggle).toHaveBeenCalledWith("dark", false);
  });
});
