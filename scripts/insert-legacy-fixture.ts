import mongoose from "mongoose";
import { loadLocalEnv } from "./load-env";

loadLocalEnv();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection has no database handle");
  }

  const clients = db.collection("clients");
  const orders = db.collection("orders");
  const scripts = db.collection("scripts");
  const shoots = db.collection("shoots");

  const result = await clients.insertOne({
    name: "Legacy Contact",
    company_name: "Legacy Films Pvt Ltd",
    email: "legacy@example.com",
    phone: "9999999999",
    status: "Lead",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const clientId = result.insertedId;

  await orders.insertOne({
    clientId,
    company: "Legacy Films Pvt Ltd",
    packageName: "Legacy Starter",
    contractedVideoCount: 4,
    orderedVideos: 4,
    remainingQuota: 4,
    status: "New",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await scripts.insertOne({
    clientId,
    company_name: "Legacy Films Pvt Ltd",
    videoNumber: 1,
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await shoots.insertOne({
    clientId,
    company: "Legacy Films Pvt Ltd",
    location: "Studio A",
    status: "scheduled",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Inserted legacy client ${clientId.toString()} with linked order/script/shoot`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
