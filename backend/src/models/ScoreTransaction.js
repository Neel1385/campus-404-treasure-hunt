const mongoose = require("mongoose");
const { SCORE_TRANSACTION_TYPE } = require("../utils/constants");

const scoreTransactionSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    type: {
      type: String,
      enum: Object.values(SCORE_TRANSACTION_TYPE),
      required: true,
      index: true,
    },
    points: { type: Number, required: true },
    reason: { type: String, default: "" },
    level: { type: Number },
    clueId: { type: mongoose.Schema.Types.ObjectId, ref: "Clue" },
    qrId: { type: String, default: "" },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

scoreTransactionSchema.index({ eventId: 1, teamId: 1, createdAt: -1 });

module.exports = mongoose.model("ScoreTransaction", scoreTransactionSchema);
