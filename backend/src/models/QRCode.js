const mongoose = require("mongoose");
const { QR_TYPE } = require("../utils/constants");

const qrCodeSchema = new mongoose.Schema(
  {
    qrId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    clueId: { type: mongoose.Schema.Types.ObjectId, ref: "Clue" },
    level: { type: Number, default: 0 }, // derived from clue.clueNumber; 0 for non-clue QRs
    type: { type: String, enum: Object.values(QR_TYPE), default: QR_TYPE.NORMAL },
    checkpointName: { type: String, trim: true, default: "" },
    islandName: { type: String, trim: true, default: "" },
    hintText: { type: String, default: "" }, // used by HINT type QRs
    points: { type: Number, default: 0 }, // used by BONUS / TRAP QRs
    active: { type: Boolean, default: true },
    scanCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QRCode", qrCodeSchema);
