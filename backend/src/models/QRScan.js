const mongoose = require("mongoose");

const qrScanSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    qrId: { type: String, required: true, uppercase: true },
    qrType: { type: String, default: "NORMAL" },
    clueId: { type: mongoose.Schema.Types.ObjectId, ref: "Clue" },
    level: { type: Number },
    correct: { type: Boolean, default: false },
    penalty: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// A team can only process the same QR successfully once (anti duplicate-points).
// Wrong scans are logged every time so the penalty can escalate.
qrScanSchema.index({ teamId: 1, qrId: 1 }, { unique: true, partialFilterExpression: { correct: true } });

module.exports = mongoose.model("QRScan", qrScanSchema);
