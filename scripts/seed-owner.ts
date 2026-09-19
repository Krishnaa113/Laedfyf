import { loadLocalEnv } from "./load-env";
import { seedOwnerIfNeeded } from "../lib/seed-owner";

loadLocalEnv();

async function main() {
  const result = await seedOwnerIfNeeded();
  if (!result.seeded) {
    throw new Error("Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD in .env.local");
  }

  console.log(`Seeded owner account for ${result.email}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
