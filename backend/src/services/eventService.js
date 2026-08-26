const Event = require("../models/Event");
const { EVENT_STATUS } = require("../utils/constants");

// Returns the (single) event document, creating a default one on first run.
async function getOrCreateEvent() {
  let event = await Event.findOne({}).sort({ createdAt: -1 });
  if (!event) {
    event = await Event.create({
      name: "CAMPUS 404",
      description: "SCAN. SOLVE. SEARCH. SURVIVE.",
      status: EVENT_STATUS.NOT_STARTED,
      duration: 60,
    });
  }
  return event;
}

// Public, player-facing view. Never includes internal admin data.
async function getPublicEvent() {
  const event = await getOrCreateEvent();
  const status = event.effectiveStatus();
  return {
    name: event.name,
    description: event.description,
    status,
    startTime: event.startTime,
    endTime: event.endTime,
    duration: event.duration,
    remainingMs: event.remainingMs(),
    leaderboardVisible: event.settings.leaderboardVisible,
    islandNames: event.settings.islandNames instanceof Map
      ? Object.fromEntries(event.settings.islandNames)
      : event.settings.islandNames || {},
  };
}

// Full view used by the admin dashboard.
async function getAdminEvent() {
  const event = await getOrCreateEvent();
  return {
    ...event.toObject(),
    effectiveStatus: event.effectiveStatus(),
    remainingMs: event.remainingMs(),
  };
}

// Throws unless the event is currently running (ACTIVE).
function assertEventActive(event) {
  const status = event.effectiveStatus();
  if (status !== EVENT_STATUS.ACTIVE) {
    const label =
      status === EVENT_STATUS.NOT_STARTED
        ? "not started yet"
        : status === EVENT_STATUS.ENDED
          ? "over"
          : "paused";
    const err = new Error(`Event is ${label}.`);
    err.status = 409;
    err.code = `EVENT_${status}`;
    throw err;
  }
}

// Admin: start / pause / resume / end.
// Pausing freezes the clock; resuming extends endTime by the paused duration.
async function setEventStatus(admin, status, note) {
  const event = await getOrCreateEvent();
  const now = new Date();

  switch (status) {
    case EVENT_STATUS.ACTIVE: {
      if (event.status === EVENT_STATUS.PAUSED && event.pausedAt) {
        const pausedMs = now - event.pausedAt;
        if (event.endTime) event.endTime = new Date(event.endTime.getTime() + pausedMs);
        event.pausedAt = undefined;
      } else if (event.endTime && now >= event.endTime) {
        event.startTime = now;
        event.endTime = new Date(now.getTime() + event.duration * 60 * 1000);
      } else {
        if (!event.startTime) event.startTime = now;
        if (!event.endTime) {
          event.endTime = new Date(now.getTime() + event.duration * 60 * 1000);
        }
      }
      event.status = EVENT_STATUS.ACTIVE;
      break;
    }
    case EVENT_STATUS.PAUSED: {
      if (event.status === EVENT_STATUS.ACTIVE) {
        event.status = EVENT_STATUS.PAUSED;
        event.pausedAt = now;
      }
      break;
    }
    case EVENT_STATUS.ENDED: {
      event.status = EVENT_STATUS.ENDED;
      event.pausedAt = undefined;
      break;
    }
    case EVENT_STATUS.NOT_STARTED: {
      event.status = EVENT_STATUS.NOT_STARTED;
      event.startTime = undefined;
      event.endTime = undefined;
      event.pausedAt = undefined;
      break;
    }
    default:
      throw Object.assign(new Error("Unknown event status"), { status: 400, code: "VALIDATION_ERROR" });
  }

  await event.save();
  await logAudit(admin, "EVENT_SET_STATUS", "Event", String(event._id), undefined, status, note);
  return event;
}

// Reset all team progress, scans, submissions and audit logs.
async function resetEvent(admin) {
  const { Team, QRScan, Submission, AuditLog, ScoreTransaction } = require("../models");
  const event = await getOrCreateEvent();

  await Team.updateMany(
    { role: "player" },
    {
      $set: {
        points: 0,
        currentClue: 1,
        currentLevel: 1,
        completedLevels: [],
        levelStartedAt: undefined,
        clueUnlocked: false,
        solvedClues: [],
        wrongScans: 0,
        lockedClue: false,
        hintsUsed: [],
        bonusClaimed: [],
        status: "active",
        startTime: undefined,
        endTime: undefined,
        finalScore: undefined,
      },
    }
  );
  await QRScan.deleteMany({});
  await Submission.deleteMany({});
  await ScoreTransaction.deleteMany({});
  await AuditLog.deleteMany({});

  await event.updateOne({
    status: EVENT_STATUS.NOT_STARTED,
    startTime: undefined,
    endTime: undefined,
    pausedAt: undefined,
  });

  await logAudit(admin, "EVENT_RESET", "Event", String(event._id), undefined, "all progress cleared", "Reset event");
  return event;
}

// Update admin settings (event name, penalties, toggles...).
async function updateEventSettings(admin, patch) {
  const event = await getOrCreateEvent();
  const allowed = [
    "name", "description", "duration", "startTime", "endTime", "status",
    "maxTeamSize", "maxAttemptsPerClue", "wrongScanPenaltyEnabled", "wrongScanPenalty",
    "maxWrongScans", "lockAfterMaxWrongScans", "wrongAnswerPenaltyEnabled", "wrongAnswerPenalty",
    "hint1Penalty", "hint2Penalty", "bonusQREnabled", "trapQREnabled", "hintQREnabled",
    "checkpointQREnabled", "allowNegativeScore", "leaderboardVisible", "pointsPerScan",
    "correctQRPoints", "clueCompletionPoints", "speedBonusEnabled", "speedBonusMax",
    "speedBonusT1", "speedBonusP1", "speedBonusT2", "speedBonusP2",
    "speedBonusT3", "speedBonusP3", "finalChallengePoints", "islandNames",
  ];

  for (const key of allowed) {
    if (patch[key] === undefined) continue;

    if (["maxTeamSize", "maxAttemptsPerClue", "maxWrongScans", "duration", "pointsPerScan",
      "correctQRPoints", "clueCompletionPoints", "speedBonusMax",
      "speedBonusT1", "speedBonusP1", "speedBonusT2", "speedBonusP2",
      "speedBonusT3", "speedBonusP3", "finalChallengePoints"].includes(key)) {
      event.settings[key] = Number(patch[key]);
    } else if (
      ["wrongScanPenaltyEnabled", "wrongAnswerPenaltyEnabled", "lockAfterMaxWrongScans", "bonusQREnabled", "trapQREnabled",
        "hintQREnabled", "checkpointQREnabled", "allowNegativeScore", "leaderboardVisible",
        "speedBonusEnabled"].includes(key)
    ) {
      event.settings[key] = patch[key] === true || patch[key] === "true";
    } else if (["wrongScanPenalty", "wrongAnswerPenalty", "hint1Penalty", "hint2Penalty"].includes(key)) {
      event.settings[key] = Number(patch[key]) || 0;
    } else if (key === "startTime" || key === "endTime") {
      event[key] = patch[key] ? new Date(patch[key]) : undefined;
    } else if (key === "name" || key === "description") {
      event[key] = String(patch[key]);
    } else if (key === "islandNames") {
      if (patch.islandNames && typeof patch.islandNames === "object") {
        for (const [k, v] of Object.entries(patch.islandNames)) {
          event.settings.islandNames.set(String(k), String(v));
        }
      }
    } else if (key === "status") {
      event.status = patch[key];
    }
  }

  await event.save();
  await logAudit(admin, "EVENT_SETTINGS_UPDATED", "Event", String(event._id), undefined, patch, "Settings updated");
  return event;
}

async function logAudit(admin, action, targetType, targetId, oldValue, newValue, note) {
  const { AuditLog } = require("../models");
  await AuditLog.create({
    adminId: admin ? admin._id : undefined,
    adminName: admin ? admin.teamName || admin.email || "Admin" : "System",
    action,
    targetType,
    targetId,
    oldValue,
    newValue,
    note,
  });
}

module.exports = {
  getOrCreateEvent,
  getPublicEvent,
  getAdminEvent,
  assertEventActive,
  setEventStatus,
  resetEvent,
  updateEventSettings,
};
