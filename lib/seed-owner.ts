import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function seedOwnerIfNeeded() {
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD;

  if (!email || !password) {
    return { seeded: false as const, reason: "missing-env" as const };
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

  return { seeded: true as const, email };
}
