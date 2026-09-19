function isLocalhostUrl(value: string | undefined) {
  if (!value) {
    return true;
  }
  try {
    const host = new URL(value).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return /localhost|127\.0\.0\.1/i.test(value);
  }
}

/**
 * NextAuth v4 reads NEXTAUTH_URL for CSRF, cookies, and callback URLs.
 * If Render (or any production host) still has http://localhost:3000, login
 * returns 401 and /api/auth/providers points at localhost.
 */
export function ensureAuthUrl() {
  const current = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  const renderUrl = process.env.RENDER_EXTERNAL_URL?.trim().replace(/\/$/, "");
  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (current && !isLocalhostUrl(current)) {
    return current;
  }

  if (renderUrl) {
    process.env.NEXTAUTH_URL = renderUrl;
    return renderUrl;
  }

  if (vercelUrl) {
    const origin = vercelUrl.startsWith("http")
      ? vercelUrl.replace(/\/$/, "")
      : `https://${vercelUrl}`;
    process.env.NEXTAUTH_URL = origin;
    return origin;
  }

  return current || "http://localhost:3000";
}

ensureAuthUrl();
