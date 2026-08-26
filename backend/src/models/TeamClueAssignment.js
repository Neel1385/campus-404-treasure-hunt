const mongoose = require("mongoose");

const teamClueAssignmentSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    clueId: { type: mongoose.Schema.Types.ObjectId, ref: "Clue", required: true },
    sequenceNumber: { type: Number, required: true },
    isFinal: { type: Boolean, default: false },
    assignedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

teamClueAssignmentSchema.index({ eventId: 1, teamId: 1, sequenceNumber: 1 }, { unique: true });
teamClueAssignmentSchema.index({ eventId: 1, teamId: 1, clueId: 1 }, { unique: true });

module.exports = mongoose.model("TeamClueAssignment", teamClueAssignmentSchema);
