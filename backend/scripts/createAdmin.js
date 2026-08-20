/* eslint-disable no-console */
/**
 * Create or update the admin account.
 *
 *   npm run create-admin
 *
 * Uses ADMIN_USERNAME / ADMIN_PASSWORD from backend/.env. If they are not
 * set, it uses the development defaults (DEMO only - change before a real
 * event).
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { connectDB, disconnectDB } = require("../src/config/db");
const { Admin } = require("../src/models");
const env = require("../src/config/env");

async function main() {
  await connectDB();

  const username = env.admin.username;
  const password = env.admin.password;

  const existing = await Admin.findOne({ username }).select("+passwordHash");
  if (existing) {
    existing.passwordHash = password;
    await existing.save();
    console.log(`[admin] Updated password for "${username}".`);
  } else {
    await Admin.create({ username, name: env.admin.name || "Event Organizer", passwordHash: password });
    console.log(`[admin] Created admin "${username}".`);
  }
  console.log(`[admin] Login at /admin/login with username "${username}".`);

  await disconnectDB();
}

main().catch((err) => {
  console.error("[admin] Failed:", err);
  process.exit(1);
});
