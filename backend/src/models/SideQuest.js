const mongoose = require("mongoose");

const sideQuestSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    instructions: { type: String, default: "" },
    points: { type: Number, default: 50 },
    penalty: { type: Number, default: 0 },
    qrId: { type: String, default: "", uppercase: true, trim: true },
    question: { type: String, default: "" },
    answer: { type: String, default: "", trim: true },
    secretCodeReward: { type: String, default: "", trim: true },
    enabled: { type: Boolean, default: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

sideQuestSchema.index({ eventId: 1, qrId: 1 });

module.exports = mongoose.model("SideQuest", sideQuestSchema);
