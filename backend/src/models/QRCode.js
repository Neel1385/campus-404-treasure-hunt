const mongoose = require("mongoose");
const { QR_TYPE } = require("../utils/constants");

const qrCodeSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    qrId: { type: String, required: true, uppercase: true, trim: true },
    clueId: { type: mongoose.Schema.Types.ObjectId, ref: "Clue" },
    sideQuestId: { type: mongoose.Schema.Types.ObjectId, ref: "SideQuest" },
    level: { type: Number, default: 0 },
    type: { type: String, enum: Object.values(QR_TYPE), default: QR_TYPE.NORMAL },
    checkpointName: { type: String, trim: true, default: "" },
    islandName: { type: String, trim: true, default: "" },
    hintText: { type: String, default: "" },
    points: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    scanCount: { type: Number, default: 0 },
    branding: {
      logo: { type: String, default: "" },
      qrColor: { type: String, default: "#000000" },
      bgColor: { type: String, default: "#ffffff" },
      label: { type: String, default: "" },
      customText: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

qrCodeSchema.index({ eventId: 1, qrId: 1 }, { unique: true });

module.exports = mongoose.model("QRCode", qrCodeSchema);
