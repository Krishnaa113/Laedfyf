export async function register() {
  const { ensureAuthUrl } = await import("./lib/auth-url");
  ensureAuthUrl();

  try {
    const { seedOwnerIfNeeded } = await import("./lib/seed-owner");
    const result = await seedOwnerIfNeeded();
    if (result.seeded) {
      console.log(`[seed] owner ready: ${result.email}`);
    }
  } catch (error) {
    console.error("[seed] owner seed failed", error);
  }
}
