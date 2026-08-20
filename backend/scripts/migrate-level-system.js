/**
 * Migration script: Adds new fields for the Level-by-Level + Score Transaction system.
 * Run: node scripts/migrate-level-system.js
 *
 * Safe to run multiple times (idempotent).
 * Does NOT destroy existing data.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("[migrate] Connected to MongoDB");

  const db = mongoose.connection.db;

  // 1. Teams: add currentLevel, completedLevels, levelStartedAt
  console.log("[migrate] Updating Team documents...");
  const teamResult = await db.collection("teams").updateMany(
    { role: "player", currentLevel: { $exists: false } },
    [
      {
        $set: {
          currentLevel: "$currentClue",
          completedLevels: {
            $map: {
              input: "$solvedClues",
              as: "sc",
              in: "$$sc.clueNumber",
            },
          },
        },
      },
    ]
  );
  console.log(`[migrate]   ${teamResult.modifiedCount} teams updated with currentLevel/completedLevels`);

  // 2. QRCode: add level from associated clue's clueNumber
  console.log("[migrate] Updating QRCode documents...");
  const qrs = await db.collection("qrcodes").find({ level: { $exists: false } }).toArray();
  let qrUpdated = 0;
  for (const qr of qrs) {
    let level = 0;
    if (qr.clueId) {
      const clue = await db.collection("clues").findOne({ _id: qr.clueId });
      if (clue) level = clue.clueNumber;
    }
    await db.collection("qrcodes").updateOne({ _id: qr._id }, { $set: { level } });
    qrUpdated++;
  }
  console.log(`[migrate]   ${qrUpdated} QR codes updated with level`);

  // 3. Event settings: add new fields if missing
  console.log("[migrate] Updating Event settings...");
  const defaultSettings = {
    correctQRPoints: 10,
    clueCompletionPoints: 0,
    speedBonusEnabled: true,
    speedBonusMax: 10,
    speedBonusT1: 120,
    speedBonusP1: 10,
    speedBonusT2: 240,
    speedBonusP2: 5,
    speedBonusT3: 300,
    speedBonusP3: 2,
    finalChallengePoints: 50,
    wrongAnswerPenaltyEnabled: true,
  };

  const eventResult = await db.collection("events").updateOne(
    {},
    { $setOnInsert: {} } // just ensure collection is accessible
  );

  const events = await db.collection("events").find({}).toArray();
  for (const evt of events) {
    const currentSettings = evt.settings || {};
    const patch = {};
    for (const [key, val] of Object.entries(defaultSettings)) {
      if (currentSettings[key] === undefined) {
        patch[`settings.${key}`] = val;
      }
    }
    // Also upgrade wrongScanPenalty default from 2 to 5 if it's still at old default
    if (currentSettings.wrongScanPenalty === 2) {
      patch["settings.wrongScanPenalty"] = 5;
    }
    // Upgrade pointsPerScan from 0 to 10 if still at old default
    if (currentSettings.pointsPerScan === 0) {
      patch["settings.pointsPerScan"] = 10;
    }

    if (Object.keys(patch).length > 0) {
      await db.collection("events").updateOne({ _id: evt._id }, { $set: patch });
      console.log(`[migrate]   Event ${evt._id}: ${Object.keys(patch).length} new settings added`);
    }
  }

  console.log("[migrate] Migration complete!");
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("[migrate] Error:", err);
  process.exit(1);
});
