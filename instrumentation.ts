export async function register() {
  const { ensureAuthUrl } = await import("./lib/auth-url");
  ensureAuthUrl();
}
