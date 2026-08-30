const mongoose = require("mongoose");
const { EVENT_STATUS } = require("../utils/constants");

const themeSchema = new mongoose.Schema(
  {
    logo: { type: String, default: "" },
    primaryColor: { type: String, default: "#10b981" },
    secondaryColor: { type: String, default: "#065f46" },
    accentColor: { type: String, default: "#f59e0b" },
    backgroundColor: { type: String, default: "#0f172a" },
    textColor: { type: String, default: "#f8fafc" },
    heroBanner: { type: String, default: "" },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, default: "CAMPUS 404" },
    description: { type: String, default: "SCAN. SOLVE. SEARCH. SURVIVE." },
    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.DRAFT,
    },
    startTime: { type: Date },
    endTime: { type: Date },
    duration: { type: Number, default: 60 }, // minutes
    pausedAt: { type: Date },
    theme: { type: themeSchema, default: () => ({}) },
    rulesAndRegulations: { type: String, default: "1. Respect campus property.\n2. Do not tamper with QR codes.\n3. Fair play enforced at all times." },
    settings: {
      maxTeamSize: { type: Number, default: 4 },
      maxAttemptsPerClue: { type: Number, default: 3 },
      wrongScanPenaltyEnabled: { type: Boolean, default: true },
      wrongScanPenalty: { type: Number, default: 5 },
      maxWrongScans: { type: Number, default: 10 },
      lockAfterMaxWrongScans: { type: Boolean, default: false },

      // Wrong-QR Blocking Engine
      wrongScanBlockingEnabled: { type: Boolean, default: false },
      wrongScanBlockStrategy: { type: String, enum: ["TIME", "SCAN_COUNT", "BOTH"], default: "TIME" },
      wrongScanBlockThreshold: { type: Number, default: 3 },
      wrongScanBlockDuration: { type: Number, default: 5 }, // minutes
      wrongScanBlockedScanCount: { type: Number, default: 3 },

      // Randomized clue pool options
      cluesPerTeam: { type: Number, default: 5 },
      fixedFirstClueId: { type: mongoose.Schema.Types.ObjectId, ref: "Clue" },
      finalClueId: { type: mongoose.Schema.Types.ObjectId, ref: "Clue" },
      enableSecretCode: { type: Boolean, default: true },

      // Side Quests & Final Challenge
      sideQuestsEnabled: { type: Boolean, default: true },
      finalChallengeType: { type: String, enum: ["SECRET_CODE", "SECRET_FRAGMENTS", "FINAL_QR", "FINAL_QUESTION"], default: "SECRET_CODE" },
      finalSecretCode: { type: String, default: "CAMPUS404" },
      finalQuestionText: { type: String, default: "" },
      finalQuestionAnswer: { type: String, default: "" },

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
      finalChallengePoints: { type: Number, default: 100 },
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

eventSchema.methods.effectiveStatus = function () {
  if (this.status === EVENT_STATUS.ENDED || this.status === EVENT_STATUS.ARCHIVED) return this.status;
  if (this.status === EVENT_STATUS.DRAFT || this.status === EVENT_STATUS.READY) return this.status;
  if (this.status === EVENT_STATUS.PAUSED) return EVENT_STATUS.PAUSED;
  if (this.endTime && new Date() >= this.endTime) return EVENT_STATUS.ENDED;
  return EVENT_STATUS.RUNNING; // or ACTIVE
};

eventSchema.methods.remainingMs = function () {
  const status = this.effectiveStatus();
  if (status === EVENT_STATUS.ENDED || status === EVENT_STATUS.ARCHIVED) return 0;
  if (status === EVENT_STATUS.DRAFT || status === EVENT_STATUS.READY) {
    return this.startTime ? Math.max(0, this.startTime - new Date()) : 0;
  }
  if (status === EVENT_STATUS.PAUSED) {
    return this.pausedAt
      ? Math.max(0, this.endTime - this.pausedAt)
      : this.endTime
        ? Math.max(0, this.endTime - new Date())
        : 0;
  }
  return this.endTime ? Math.max(0, this.endTime - new Date()) : 0;
};

module.exports = mongoose.model("Event", eventSchema);
