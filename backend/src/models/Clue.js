const mongoose = require("mongoose");
const { ANSWER_TYPE, DIFFICULTY } = require("../utils/constants");

const hintSchema = new mongoose.Schema(
  {
    text: { type: String, default: "" },
    penalty: { type: Number, default: 0 },
  },
  { _id: false }
);

const clueSchema = new mongoose.Schema(
  {
    clueNumber: { type: Number, required: true, unique: true, min: 1 },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: Object.values(DIFFICULTY), default: DIFFICULTY.EASY },
    checkpointName: { type: String, required: true, trim: true },
    answerType: { type: String, enum: Object.values(ANSWER_TYPE), default: ANSWER_TYPE.TEXT },
    correctAnswer: { type: String, required: true, trim: true },
    acceptedAnswers: { type: [String], default: [] },
    options: { type: [String], default: [] }, // for MULTIPLE_CHOICE
    points: { type: Number, default: 10, min: 0 },
    hints: { type: [hintSchema], default: [] },
    maxAttempts: { type: Number, default: 3 },
    timeLimit: { type: Number }, // optional, in seconds
    active: { type: Boolean, default: true },
    isFinal: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  },
  { timestamps: true }
);

clueSchema.methods.toSafeJSON = function () {
  // NOTE: never expose correctAnswer / acceptedAnswers to players.
  return {
    id: this._id,
    clueNumber: this.clueNumber,
    title: this.title,
    description: this.description,
    difficulty: this.difficulty,
    checkpointName: this.checkpointName,
    answerType: this.answerType,
    options: this.answerType === "MULTIPLE_CHOICE" ? this.options : [],
    points: this.points,
    hints: this.hints,
    isFinal: this.isFinal,
  };
};

module.exports = mongoose.model("Clue", clueSchema);
