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
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    teamId: { type: String, required: true, trim: true, uppercase: true },
    teamName: { type: String, required: true, trim: true },
    members: {
      type: [memberSchema],
      validate: [(v) => v.length >= 3 && v.length <= 4, "A team must have 3 to 4 members"],
    },
    passwordHash: { type: String, required: true, select: false },
    plainPassword: { type: String, default: "" },
    role: { type: String, enum: ["player", "admin"], default: "player" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    points: { type: Number, default: 0 },
    currentClue: { type: Number, default: 1 },
    currentLevel: { type: Number, default: 1 },
    completedLevels: { type: [Number], default: [] },
    completedSideQuests: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    collectedSecretFragments: { type: [String], default: [] },
    levelStartedAt: { type: Date },
    clueUnlocked: { type: Boolean, default: false },
    solvedClues: { type: [solvedClueSchema], default: [] },
    wrongScans: { type: Number, default: 0 },
    lockedClue: { type: Boolean, default: false },

    // Team Blocking Engine Fields
    blocked: { type: Boolean, default: false },
    blockedUntil: { type: Date },
    remainingBlockedScans: { type: Number, default: 0 },
    blockReason: { type: String, default: "" },

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
    bonusClaimed: { type: [String], default: [] },
    status: { type: String, enum: Object.values(TEAM_STATUS), default: TEAM_STATUS.ACTIVE },
    startTime: { type: Date },
    endTime: { type: Date },
    finalScore: { type: Number },
  },
  { timestamps: true }
);

teamSchema.index({ eventId: 1, teamId: 1 }, { unique: true });
teamSchema.index({ eventId: 1, teamName: 1 }, { unique: true });

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
    eventId: this.eventId,
    teamId: this.teamId,
    teamName: this.teamName,
    role: this.role,
    points: this.points,
    currentClue: this.currentClue,
    currentLevel: this.currentLevel,
    completedLevels: this.completedLevels,
    completedSideQuests: this.completedSideQuests,
    collectedSecretFragments: this.collectedSecretFragments,
    clueUnlocked: this.clueUnlocked,
    solvedClues: this.solvedClues,
    wrongScans: this.wrongScans,
    lockedClue: this.lockedClue,
    blocked: this.blocked,
    blockedUntil: this.blockedUntil,
    remainingBlockedScans: this.remainingBlockedScans,
    blockReason: this.blockReason,
    hintsUsed: this.hintsUsed,
    plainPassword: this.plainPassword,
    status: this.status,
    startTime: this.startTime,
    endTime: this.endTime,
    finalScore: this.finalScore,
    members: this.members,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("Team", teamSchema);
