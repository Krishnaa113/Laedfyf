import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  indexesPromise: Promise<void> | null;
}

const globalWithMongoose = globalThis as typeof globalThis & {
  mongoose?: MongooseCache;
};

const cached: MongooseCache = globalWithMongoose.mongoose ?? {
  conn: null,
  promise: null,
  indexesPromise: null,
};

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = cached;
}

async function registerModelsAndIndexes() {
  const { Client, CreatorPayout, Notification } = await import("@/models");
  try {
    await Client.updateMany(
      { $or: [{ inviteToken: null }, { inviteToken: "" }] },
      { $unset: { inviteToken: 1 } },
    );
    await Client.syncIndexes();
  } catch (error) {
    console.error("Client invite index sync failed", error);
  }
  await Promise.all([CreatorPayout.syncIndexes(), Notification.syncIndexes()]);
}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI. Copy .env.example to .env.local and set your MongoDB connection string.",
    );
  }

  if (cached.conn) {
    if (!cached.indexesPromise) {
      cached.indexesPromise = registerModelsAndIndexes();
    }
    await cached.indexesPromise;
    return cached.conn;
  }

  if (!cached.promise) {
    mongoose.set("overwriteModels", true);
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
    cached.indexesPromise ??= registerModelsAndIndexes();
    await cached.indexesPromise;
  } catch (error) {
    cached.promise = null;
    cached.indexesPromise = null;
    throw error;
  }

  return cached.conn;
}

export function getDbReadyState(): number {
  return mongoose.connection.readyState;
}

export async function startDbSession() {
  await connectDB();
  return mongoose.startSession();
}
