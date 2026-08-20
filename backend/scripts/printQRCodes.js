// Builds a print-ready HTML sheet of all generated QR codes.
//
//   npm run print:qrs      -> reads generated-qrcodes/manifest.json, writes qr-sheets.html
//
// The sheet shows the QR image + checkpoint/type label. It NEVER prints answers.

const path = require("path");
const fs = require("fs");

const OUT_DIR = path.join(__dirname, "..", "generated-qrcodes");
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");
const SHEET_PATH = path.join(__dirname, "..", "qr-sheets.html");

function run() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error("[print] No manifest.json found. Run `npm run generate:qrs` first.");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

  const cards = manifest
    .map((entry) => {
      const title = entry.clueNumber
        ? `Clue ${entry.clueNumber}`
        : entry.type === "NORMAL"
          ? "QR"
          : entry.type;
      const subtitle = entry.checkpointName || entry.qrId;
      const file = encodeURIComponent(entry.file);
      return `
        <div class="card">
          <img src="generated-qrcodes/${file}" alt="${entry.qrId}" />
          <div class="label"><strong>${title}</strong></div>
          <div class="sub">${subtitle}</div>
        </div>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CAMPUS 404 - QR Print Sheets</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    p.note { font-size: 12px; color: #666; margin-top: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .card { border: 1px solid #ccc; border-radius: 8px; padding: 12px; text-align: center; break-inside: avoid; }
    .card img { width: 100%; max-width: 200px; image-rendering: pixelated; }
    .label { font-size: 14px; margin-top: 8px; }
    .sub { font-size: 12px; color: #444; word-break: break-all; }
    @media print {
      .card { border: 1px solid #999; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>CAMPUS 404 - QR Code Print Sheets</h1>
  <p class="note">Scan the code with a phone camera. It opens the game URL. Answers are intentionally not printed.</p>
  <div class="grid">
${cards}
  </div>
</body>
</html>`;

  fs.writeFileSync(SHEET_PATH, html, "utf8");
  console.log(`[print] Wrote ${SHEET_PATH} with ${manifest.length} QR card(s).`);
  console.log(`[print] Open it in a browser and use Ctrl+P / Cmd+P to print.`);
}

run();
