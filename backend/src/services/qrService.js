const crypto = require("crypto");
const { QRCode } = require("../models");
const { frontendUrl } = require("../config/env");

// Generates a secure, unpredictable, human-friendly QR id like "X7K92P8L".
function generateQRId(bytes = 6) {
  return crypto
    .randomBytes(bytes)
    .toString("hex")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "0")
    .slice(0, bytes * 2);
}

// Full public URL a phone opens when it scans the QR.
function qrUrl(qrId) {
  return `${frontendUrl.replace(/\/$/, "")}/scan/${qrId}`;
}

// Ensures a QR id is unique in the database (retries on collision).
async function uniqueQRId() {
  for (let i = 0; i < 10; i++) {
    const id = generateQRId();
    const exists = await QRCode.findOne({ qrId: id });
    if (!exists) return id;
  }
  throw new Error("Could not generate a unique QR id. Try again.");
}

module.exports = { generateQRId, qrUrl, uniqueQRId };
