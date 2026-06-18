export type ThemePreference = "dark" | "light";

export const THEME_STORAGE_KEY = "theme";

type ThemeStorage = Pick<Storage, "getItem" | "setItem">;
type ThemeRoot = Pick<HTMLElement, "classList">;

export function resolveThemePreference(storedTheme: string | null | undefined): ThemePreference {
  return storedTheme === "light" ? "light" : "dark";
}

export function getStoredThemePreference(
  storage: ThemeStorage = window.localStorage,
): ThemePreference {
  try {
    return resolveThemePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "dark";
  }
}

export function applyThemePreference(
  theme: ThemePreference,
  root: ThemeRoot = document.documentElement,
): ThemePreference {
  root.classList.toggle("dark", theme === "dark");
  return theme;
}

export function applyStoredThemePreference(
  storage: ThemeStorage = window.localStorage,
  root: ThemeRoot = document.documentElement,
): ThemePreference {
  return applyThemePreference(getStoredThemePreference(storage), root);
}

export function setThemePreference(
  theme: ThemePreference,
  storage: ThemeStorage = window.localStorage,
  root: ThemeRoot = document.documentElement,
): ThemePreference {
  applyThemePreference(theme, root);
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The visual preference still applies even if storage is unavailable.
  }
  return theme;
}
