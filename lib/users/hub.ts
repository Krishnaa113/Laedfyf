import { connectDB } from "@/lib/db";
import { serializeUser, type SerializedUser } from "@/lib/serialize";
import { User } from "@/models/User";

export async function loadUserList() {
  await connectDB();
  const docs = await User.find({}).sort({ createdAt: -1 }).lean();
  return docs
    .map((doc) => serializeUser(doc))
    .filter((user): user is SerializedUser => Boolean(user));
}

export async function loadUserHub(userId: string) {
  await connectDB();
  const doc = await User.findById(userId).lean();
  if (!doc) {
    return null;
  }
  return serializeUser(doc);
}
