const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    clueId: { type: mongoose.Schema.Types.ObjectId, ref: "Clue", required: true },
    clueNumber: { type: Number },
    answer: { type: String, trim: true },
    correct: { type: Boolean, required: true },
    pointsAwarded: { type: Number, default: 0 },
    attemptNumber: { type: Number, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);
