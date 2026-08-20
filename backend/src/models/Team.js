const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { TEAM_STATUS } = require("../utils/constants");

const memberSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    collegeId: { type: String, required: true, trim: true, uppercase: true },
  },
  { _id: false }
);

const solvedClueSchema = new mongoose.Schema(
  {
    clueNumber: { type: Number, required: true },
    title: { type: String, default: "" },
    solvedAt: { type: Date, default: Date.now },
    pointsEarned: { type: Number, default: 0 },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    teamId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    teamName: { type: String, required: true, unique: true, trim: true },
    members: {
      type: [memberSchema],
      validate: [(v) => v.length >= 3 && v.length <= 4, "A team must have 3 to 4 members"],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["player", "admin"], default: "player" },
    email: { type: String, trim: true, lowercase: true, default: "" }, // used by admin accounts
    points: { type: Number, default: 0 },
    currentClue: { type: Number, default: 1 },
    currentLevel: { type: Number, default: 1 }, // mirrors currentClue; used for level-based QR validation
    completedLevels: { type: [Number], default: [] }, // [1,2,3] means levels 1-3 are done
    levelStartedAt: { type: Date }, // timestamp when current level was unlocked (for speed bonus)
    clueUnlocked: { type: Boolean, default: false }, // scanned the current clue's QR?
    solvedClues: { type: [solvedClueSchema], default: [] },
    wrongScans: { type: Number, default: 0 },
    lockedClue: { type: Boolean, default: false }, // attempt limit reached
    hintsUsed: {
      type: [
        {
          clueNumber: Number,
          hintNumber: Number,
          penalty: Number,
          usedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    bonusClaimed: { type: [String], default: [] }, // QR ids already processed for bonus/trap/hint QRs
    status: { type: String, enum: Object.values(TEAM_STATUS), default: TEAM_STATUS.ACTIVE },
    startTime: { type: Date },
    endTime: { type: Date }, // completion time
    finalScore: { type: Number },
  },
  { timestamps: true }
);

// Hash password before saving.
teamSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

teamSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

teamSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    teamId: this.teamId,
    teamName: this.teamName,
    role: this.role,
    points: this.points,
    currentClue: this.currentClue,
    currentLevel: this.currentLevel,
    completedLevels: this.completedLevels,
    clueUnlocked: this.clueUnlocked,
    solvedClues: this.solvedClues,
    wrongScans: this.wrongScans,
    lockedClue: this.lockedClue,
    hintsUsed: this.hintsUsed,
    status: this.status,
    startTime: this.startTime,
    endTime: this.endTime,
    finalScore: this.finalScore,
    members: this.members,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("Team", teamSchema);
