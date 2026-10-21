import { describe, it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ sign: vi.fn(), bucket: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: mocks.bucket } },
}));
import { getPrivateCertificateUrl } from "@/lib/privateCertificates";
const path = "00000000-0000-4000-8000-000000000001/test.svg";
beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://synthetic.supabase.invalid");
  vi.clearAllMocks();
  mocks.bucket.mockReturnValue({ createSignedUrl: mocks.sign });
});
describe("owner-authorized certificate downloads", () => {
  it("renews expired URLs using a five-minute storage signature", async () => {
    mocks.sign.mockResolvedValue({
      data: { signedUrl: "signed-fresh" },
      error: null,
    });
    expect(
      await getPrivateCertificateUrl(
        "https://synthetic.supabase.invalid/storage/v1/object/sign/certificates/" +
          path +
          "?token=expired",
      ),
    ).toBe("signed-fresh");
    expect(mocks.bucket).toHaveBeenCalledWith("certificates");
    expect(mocks.sign).toHaveBeenCalledWith(path, 300);
  });
  it("never falls back to a public URL when storage denies access", async () => {
    mocks.sign.mockResolvedValue({
      data: null,
      error: { message: "RLS denied" },
    });
    await expect(getPrivateCertificateUrl(path)).rejects.toThrow("unavailable");
  });
  it("rejects foreign locations before requesting storage access", async () => {
    await expect(
      getPrivateCertificateUrl("https://evil.invalid/certificate.svg"),
    ).rejects.toThrow();
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});
