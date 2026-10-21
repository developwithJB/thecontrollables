import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  captureOAuthReturn,
  takeOAuthReturn,
  trustedOAuthMessage,
} from "@/lib/oauthReturn";
const code = "synthetic-authorization-code",
  state = "a".repeat(64);
beforeEach(() => {
  takeOAuthReturn();
  vi.stubGlobal("window", {
    location: {
      hash:
        "#" + new URLSearchParams({ oauth_return: "wearable", code, state }),
      pathname: "/wellness",
      search: "",
    },
    history: { replaceState: vi.fn() },
  });
});
describe("OAuth return privacy and popup provenance", () => {
  it("clears authorization code before capture and releases it only once", () => {
    captureOAuthReturn();
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/wellness",
    );
    expect(takeOAuthReturn()).toEqual({ family: "wearable", code, state });
    expect(takeOAuthReturn()).toBeNull();
  });
  it.each(["bad", "integration-other"])(
    "rejects unsupported family %s",
    (family) => {
      window.location.hash =
        "#" + new URLSearchParams({ oauth_return: family, code, state });
      captureOAuthReturn();
      expect(takeOAuthReturn()).toBeNull();
      expect(window.history.replaceState).toHaveBeenCalled();
    },
  );
  it("drops legacy or malformed state rather than forwarding it", () => {
    window.location.hash =
      "#" +
      new URLSearchParams({
        oauth_return: "integration",
        code,
        state: "unsigned-base64",
      });
    captureOAuthReturn();
    expect(takeOAuthReturn()).toBeNull();
  });
  it("requires both same origin and the exact popup window", () => {
    const popup = {} as Window;
    expect(
      trustedOAuthMessage(
        { origin: "https://app.invalid", source: popup },
        "https://app.invalid",
        popup,
      ),
    ).toBe(true);
    expect(
      trustedOAuthMessage(
        { origin: "https://evil.invalid", source: popup },
        "https://app.invalid",
        popup,
      ),
    ).toBe(false);
    expect(
      trustedOAuthMessage(
        { origin: "https://app.invalid", source: {} as Window },
        "https://app.invalid",
        popup,
      ),
    ).toBe(false);
    expect(
      trustedOAuthMessage(
        { origin: "https://app.invalid", source: null },
        "https://app.invalid",
        null,
      ),
    ).toBe(false);
  });
});
