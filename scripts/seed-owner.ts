import bcrypt from "bcryptjs";
import { loadLocalEnv } from "./load-env";
import { connectDB } from "../lib/db";
import { User } from "../models/User";

loadLocalEnv();

async function main() {
  const email = process.env.SEED_OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD;

  if (!email || !password) {
    throw new Error("Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD in .env.local");
  }

  await connectDB();

  const passwordHash = await bcrypt.hash(password, 12);
  await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name: "Leadyfy Owner",
        email,
        passwordHash,
        role: "owner",
        isActive: true,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  console.log(`Seeded owner account for ${email}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
