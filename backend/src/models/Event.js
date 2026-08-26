const mongoose = require("mongoose");
const { EVENT_STATUS } = require("../utils/constants");

// A single event document holds the event lifecycle and admin settings.
const eventSchema = new mongoose.Schema(
  {
    name: { type: String, default: "CAMPUS 404" },
    description: { type: String, default: "SCAN. SOLVE. SEARCH. SURVIVE." },
    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.NOT_STARTED,
    },
    startTime: { type: Date },
    endTime: { type: Date },
    duration: { type: Number, default: 60 }, // minutes
    pausedAt: { type: Date },
    settings: {
      maxTeamSize: { type: Number, default: 4 },
      maxAttemptsPerClue: { type: Number, default: 3 },
      wrongScanPenaltyEnabled: { type: Boolean, default: true },
      wrongScanPenalty: { type: Number, default: 5 },
      maxWrongScans: { type: Number, default: 10 },
      lockAfterMaxWrongScans: { type: Boolean, default: false },
      wrongAnswerPenaltyEnabled: { type: Boolean, default: false },
      wrongAnswerPenalty: { type: Number, default: 0 },
      hint1Penalty: { type: Number, default: 3 },
      hint2Penalty: { type: Number, default: 5 },
      bonusQREnabled: { type: Boolean, default: true },
      trapQREnabled: { type: Boolean, default: true },
      hintQREnabled: { type: Boolean, default: true },
      checkpointQREnabled: { type: Boolean, default: true },
      allowNegativeScore: { type: Boolean, default: false },
      leaderboardVisible: { type: Boolean, default: true },
      pointsPerScan: { type: Number, default: 0 },
      correctQRPoints: { type: Number, default: 0 },
      clueCompletionPoints: { type: Number, default: 0 },
      speedBonusEnabled: { type: Boolean, default: false },
      speedBonusMax: { type: Number, default: 10 },
      speedBonusT1: { type: Number, default: 120 },
      speedBonusP1: { type: Number, default: 10 },
      speedBonusT2: { type: Number, default: 240 },
      speedBonusP2: { type: Number, default: 5 },
      speedBonusT3: { type: Number, default: 300 },
      speedBonusP3: { type: Number, default: 2 },
      finalChallengePoints: { type: Number, default: 0 },
      islandNames: {
        type: Map,
        of: String,
        default: new Map([
          ["1", "Loguetown"],
          ["2", "Baratie"],
          ["3", "Arlong Park"],
          ["4", "Alabasta"],
          ["5", "Skypiea"],
          ["6", "Water 7"],
          ["7", "Thriller Bark"],
          ["8", "Sabaody Archipelago"],
          ["9", "Marineford"],
          ["10", "Fish-Man Island"],
          ["11", "Dressrosa"],
          ["12", "Whole Cake Island"],
          ["13", "Wano Country"],
        ]),
      },
    },
  },
  { timestamps: true }
);

// Effective status. If the clock ran past endTime, the event is ENDED.
eventSchema.methods.effectiveStatus = function () {
  if (this.status === EVENT_STATUS.ENDED) return EVENT_STATUS.ENDED;
  if (this.status === EVENT_STATUS.NOT_STARTED) return EVENT_STATUS.NOT_STARTED;
  if (this.status === EVENT_STATUS.PAUSED) return EVENT_STATUS.PAUSED;
  if (this.endTime && new Date() >= this.endTime) return EVENT_STATUS.ENDED;
  return EVENT_STATUS.ACTIVE;
};

eventSchema.methods.remainingMs = function () {
  const status = this.effectiveStatus();
  if (status === EVENT_STATUS.ENDED) return 0;
  if (status === EVENT_STATUS.NOT_STARTED) {
    return this.startTime ? Math.max(0, this.startTime - new Date()) : 0;
  }
  if (status === EVENT_STATUS.PAUSED) {
    // Time is frozen; report what was left when paused.
    return this.pausedAt
      ? Math.max(0, this.endTime - this.pausedAt)
      : this.endTime
        ? Math.max(0, this.endTime - new Date())
        : 0;
  }
  return this.endTime ? Math.max(0, this.endTime - new Date()) : 0;
};

module.exports = mongoose.model("Event", eventSchema);
