const mongoose = require("mongoose");

const qrScanSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    qrId: { type: String, required: true, uppercase: true },
    qrType: { type: String, default: "NORMAL" },
    clueId: { type: mongoose.Schema.Types.ObjectId, ref: "Clue" },
    level: { type: Number },
    correct: { type: Boolean, default: false },
    penalty: { type: Number, default: 0 },
  },
  { timestamps: true }
);

qrScanSchema.index({ eventId: 1, teamId: 1, qrId: 1 }, { unique: true, partialFilterExpression: { correct: true } });

module.exports = mongoose.model("QRScan", qrScanSchema);
