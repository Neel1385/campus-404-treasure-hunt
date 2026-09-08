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

async function generateStyledQRSVG(qrId, textCode, logoUrl) {
  const qrcode = require("qrcode");
  const targetUrl = qrUrl(qrId);

  const rawSvg = await qrcode.toString(targetUrl, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const logoHref = logoUrl && logoUrl.startsWith("data:image")
    ? logoUrl
    : logoUrl || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23ffffff" stroke="%230284c7" stroke-width="4"/><path d="M 25,30 L 45,75 L 55,75 L 75,30 L 62,30 L 50,60 L 38,30 Z" fill="%230284c7"/><path d="M 40,48 L 70,48 L 60,40 L 30,40 Z" fill="%2338bdf8"/><text x="50" y="88" font-size="12" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="%230284c7">VIVACITY</text></svg>`;

  const cleanSvgContent = rawSvg.replace(/<svg[^>]*>/, "").replace("</svg>", "");
  const hasText = Boolean(textCode && String(textCode).trim());
  const totalHeight = hasText ? 480 : 400;

  const textSection = hasText ? `
    <g transform="translate(0, 410)">
      <rect x="20" y="0" width="360" height="54" rx="12" fill="#fef3c7" stroke="#b45309" stroke-width="3"/>
      <text x="200" y="34" font-family="monospace, sans-serif" font-size="16" font-weight="bold" fill="#78350f" text-anchor="middle">
        QR Code : Text Code : ${String(textCode).trim()}
      </text>
    </g>
  ` : "";

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 ${totalHeight}" width="800" height="${totalHeight * 2}">
  <rect width="400" height="${totalHeight}" fill="#ffffff" rx="16"/>
  <g transform="translate(0, 0)">
    ${cleanSvgContent}
  </g>
  <g transform="translate(200, 200)">
    <circle cx="0" cy="0" r="42" fill="#ffffff" stroke="#0284c7" stroke-width="4"/>
    <image href="${logoHref}" x="-36" y="-36" width="72" height="72"/>
  </g>
  ${textSection}
</svg>
  `.trim();
}

module.exports = { generateQRId, qrUrl, uniqueQRId, generateStyledQRSVG };
