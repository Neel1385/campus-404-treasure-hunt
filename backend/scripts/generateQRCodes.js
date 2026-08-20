// Generates printable QR code PNGs.
//
//   npm run generate:qrs                -> reads QR records from MongoDB, writes PNGs
//   npm run generate:qrs -- --offline   -> no DB needed: uses generated-qrcodes/manifest.json
//                                           (or generates fresh ids when none exists)
//
// Output: backend/generated-qrcodes/*.png  +  manifest.json
// The QR codes encode the public scan URL: {FRONTEND_URL}/scan/{qrId}

const path = require("path");
const fs = require("fs");
const QRCodeLib = require("qrcode");
const { frontendUrl } = require("../src/config/env");

const OUT_DIR = path.join(__dirname, "..", "generated-qrcodes");
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");

const args = process.argv.slice(2);
const offline = args.includes("--offline");

function slug(text) {
  return String(text || "QR")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "qr";
}

function safeName(entry) {
  const label = entry.clueNumber ? `clue-${entry.clueNumber}` : slug(entry.checkpointName || entry.type);
  return `${label}-${entry.qrId}.png`;
}

async function ensureDir() {
  await fs.promises.mkdir(OUT_DIR, { recursive: true });
}

// Builds { qrId, url, type, checkpointName, clueNumber } entries.
async function collectEntries() {
  if (offline) {
    if (fs.existsSync(MANIFEST_PATH)) {
      const existing = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
      console.log(`[qrs] Offline mode: using ${existing.length} QR(s) from manifest.json`);
      return existing;
    }
    // No manifest: create fresh random ids (dev/demo mode).
    const crypto = require("crypto");
    const count = parseInt(args.find((a) => /^\d+$/.test(a)) || "10", 10);
    const entries = [];
    for (let i = 0; i < count; i++) {
      const qrId = crypto
        .randomBytes(6)
        .toString("hex")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "0")
        .slice(0, 12);
      entries.push({ qrId, url: `${frontendUrl.replace(/\/$/, "")}/scan/${qrId}`, type: "NORMAL" });
    }
    console.log(`[qrs] Offline mode: generated ${entries.length} fresh QR id(s).`);
    return entries;
  }

  // DB mode.
  const { connectDB, disconnectDB } = require("../src/config/db");
  const { QRCode, Clue } = require("../src/models");

  await connectDB();
  const qrs = await QRCode.find({}).sort({ createdAt: 1 }).lean();
  const entries = [];

  for (const qr of qrs) {
    let clueNumber;
    if (qr.clueId) {
      const clue = await Clue.findById(qr.clueId).lean();
      clueNumber = clue ? clue.clueNumber : undefined;
    }
    entries.push({
      qrId: qr.qrId,
      url: `${frontendUrl.replace(/\/$/, "")}/scan/${qr.qrId}`,
      type: qr.type,
      checkpointName: qr.checkpointName || "",
      clueNumber,
    });
  }
  await disconnectDB();
  console.log(`[qrs] DB mode: found ${entries.length} QR code(s).`);
  return entries;
}

async function run() {
  await ensureDir();
  const entries = await collectEntries();

  const manifest = [];
  for (const entry of entries) {
    const filename = safeName(entry);
    const filePath = path.join(OUT_DIR, filename);
    await QRCodeLib.toFile(filePath, entry.url, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0b0b10", light: "#ffffff" },
    });
    manifest.push({ ...entry, file: filename });
    console.log(`[qrs] Wrote ${filename}  ->  ${entry.url}`);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`[qrs] Done. ${manifest.length} QR(s) in ${OUT_DIR}`);
  console.log(`[qrs] FRONTEND_URL used: ${frontendUrl}`);
}

run().catch((err) => {
  console.error("[qrs] Failed:", err);
  process.exit(1);
});
