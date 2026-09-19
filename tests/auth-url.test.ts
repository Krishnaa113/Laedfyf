import { afterEach, describe, expect, it } from "vitest";
import { ensureAuthUrl } from "@/lib/auth-url";

const original = {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
  VERCEL_URL: process.env.VERCEL_URL,
};

afterEach(() => {
  process.env.NEXTAUTH_URL = original.NEXTAUTH_URL;
  process.env.RENDER_EXTERNAL_URL = original.RENDER_EXTERNAL_URL;
  process.env.VERCEL_URL = original.VERCEL_URL;
});

describe("ensureAuthUrl", () => {
  it("replaces localhost with the Render public URL", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.RENDER_EXTERNAL_URL = "https://laedfyf.onrender.com";
    delete process.env.VERCEL_URL;

    expect(ensureAuthUrl()).toBe("https://laedfyf.onrender.com");
    expect(process.env.NEXTAUTH_URL).toBe("https://laedfyf.onrender.com");
  });

  it("keeps an explicit production URL", () => {
    process.env.NEXTAUTH_URL = "https://app.leadyfy.com";
    process.env.RENDER_EXTERNAL_URL = "https://laedfyf.onrender.com";

    expect(ensureAuthUrl()).toBe("https://app.leadyfy.com");
  });
});
