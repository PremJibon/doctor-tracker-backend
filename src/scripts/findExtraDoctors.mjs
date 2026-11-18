/**
 * Fix #4 — Find doctors NOT created by the seed script.
 * Seed creates 40 doctors with emails matching: firstname.lastname.N@careguide.bd (N = 1..40)
 * Any doctor outside this pattern is likely a leftover from testing.
 *
 * Run: node src/scripts/findExtraDoctors.mjs
 * This script is READ-ONLY. It prints _id, name, email, createdAt and exits.
 * Do NOT delete anything — wait for user approval.
 */

import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI env var not set");
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();

const db = client.db();
const col = db.collection("doctors");

// Seed pattern: word.word.number@careguide.bd
const seedPattern = /^\w+\.\w+\.\d+@careguide\.bd$/;

const all = await col.find({}, { projection: { _id: 1, name: 1, email: 1, createdAt: 1 } }).lean ? 
  col.find({}, { projection: { _id: 1, name: 1, email: 1, createdAt: 1 } }).toArray() :
  col.find({}, { projection: { _id: 1, name: 1, email: 1, createdAt: 1 } }).toArray();

const docs = await all;
const extras = docs.filter(d => !seedPattern.test(d.email ?? ""));

console.log(`Total doctors in DB: ${docs.length}`);
console.log(`Seed-pattern doctors: ${docs.length - extras.length}`);
console.log(`Extra (non-seed) doctors: ${extras.length}`);
console.log("");

if (extras.length === 0) {
  console.log("✅ No extra doctors found.");
} else {
  console.log("⚠️  Extra doctors (DO NOT DELETE without user approval):");
  for (const d of extras) {
    console.log(`  _id: ${d._id}  name: ${d.name}  email: ${d.email}  createdAt: ${d.createdAt}`);
  }
}

await client.close();
