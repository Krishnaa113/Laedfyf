import mongoose from "mongoose";
import { loadLocalEnv } from "./load-env";

loadLocalEnv();

const LEGACY_FILTER = {
  $or: [{ company: { $exists: true } }, { company_name: { $exists: true } }],
};

function canonicalName(doc: {
  companyName?: unknown;
  company_name?: unknown;
  company?: unknown;
}) {
  return String(doc.companyName ?? doc.company_name ?? doc.company ?? "").trim();
}

async function migrateCollection(
  db: mongoose.mongo.Db,
  name: string,
  keepCanonicalField: boolean,
) {
  const collection = db.collection(name);
  const docs = await collection.find(LEGACY_FILTER).toArray();
  let updated = 0;

  for (const doc of docs) {
    const companyName = canonicalName(
      doc as {
        companyName?: unknown;
        company_name?: unknown;
        company?: unknown;
      },
    );
    await collection.updateOne(
      { _id: doc._id },
      keepCanonicalField
        ? {
            $set: { companyName },
            $unset: { company: "", company_name: "" },
          }
        : {
            $unset: { company: "", company_name: "" },
          },
    );
    updated += 1;
  }

  return { name, scanned: docs.length, updated };
}

async function confirmDownstream(db: mongoose.mongo.Db) {
  const clients = db.collection("clients");
  const orders = db.collection("orders");
  const scripts = db.collection("scripts");
  const shoots = db.collection("shoots");

  const clientDocs = await clients.find({}).project({ _id: 1, companyName: 1 }).toArray();
  let ordersByClientId = 0;
  let scriptsByClientId = 0;
  let shootsByClientId = 0;
  let missingCompanyName = 0;

  for (const client of clientDocs) {
    if (!client.companyName) {
      missingCompanyName += 1;
    }

    const id = client._id;
    ordersByClientId += await orders.countDocuments({ clientId: id });
    scriptsByClientId += await scripts.countDocuments({ clientId: id });
    shootsByClientId += await shoots.countDocuments({ clientId: id });
  }

  const leftoverLegacy = {
    clients: await clients.countDocuments(LEGACY_FILTER),
    orders: await orders.countDocuments(LEGACY_FILTER),
    scripts: await scripts.countDocuments(LEGACY_FILTER),
    shoots: await shoots.countDocuments(LEGACY_FILTER),
  };

  return {
    clients: clientDocs.length,
    missingCompanyName,
    ordersByClientId,
    scriptsByClientId,
    shootsByClientId,
    leftoverLegacy,
  };
}

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

  const results = [
    await migrateCollection(db, "clients", true),
    await migrateCollection(db, "orders", false),
    await migrateCollection(db, "scripts", false),
    await migrateCollection(db, "shoots", false),
  ];

  const downstream = await confirmDownstream(db);

  console.log(JSON.stringify({ results, downstream }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
