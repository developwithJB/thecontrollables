import { describe, expect, it } from "vitest";

import {
  DEV_MOCK_USER_EMAIL,
  DEV_MOCK_USER_ID,
  getDevMockUser,
  isDevMockAuthEnabled,
  shouldShowDevMockAuthBanner,
} from "@/lib/devMockAuth";

describe("dev mock auth", () => {
  it("only enables mock auth in dev with the explicit flag", () => {
    expect(isDevMockAuthEnabled({ DEV: true, VITE_ENABLE_DEV_MOCK_AUTH: "true" })).toBe(true);
    expect(isDevMockAuthEnabled({ DEV: true, VITE_ENABLE_DEV_MOCK_AUTH: "false" })).toBe(false);
    expect(isDevMockAuthEnabled({ DEV: false, VITE_ENABLE_DEV_MOCK_AUTH: "true" })).toBe(false);
  });

  it("drives the dev QA banner from the same guard", () => {
    expect(shouldShowDevMockAuthBanner({ DEV: true, VITE_ENABLE_DEV_MOCK_AUTH: "true" })).toBe(true);
    expect(shouldShowDevMockAuthBanner({ DEV: false, VITE_ENABLE_DEV_MOCK_AUTH: "true" })).toBe(false);
  });

  it("returns a safe deterministic mock user", () => {
    const user = getDevMockUser();

    expect(user.id).toBe(DEV_MOCK_USER_ID);
    expect(user.email).toBe(DEV_MOCK_USER_EMAIL);
    expect(user.app_metadata.provider).toBe("dev-mock");
    expect(user.user_metadata.display_name).toBe("Dev QA");
  });
});
