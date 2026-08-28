const mongoose = require("mongoose");

const processedOperationSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    operationId: { type: String, required: true, index: true },
    result: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

processedOperationSchema.index({ eventId: 1, operationId: 1 }, { unique: true });

module.exports = mongoose.model("ProcessedOperation", processedOperationSchema);
