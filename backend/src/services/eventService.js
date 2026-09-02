const Event = require("../models/Event");
const { EVENT_STATUS } = require("../utils/constants");

// Returns the (single) event document, creating a default one on first run.
async function getOrCreateEvent() {
  let event = await Event.findOne({}).sort({ createdAt: -1 });
  if (!event) {
    event = await Event.create({
      name: "CAMPUS 404",
      description: "SCAN. SOLVE. SEARCH. SURVIVE.",
      status: EVENT_STATUS.RUNNING,
      duration: 60,
    });
  }
  return event;
}

async function getEventById(eventId) {
  if (!eventId) return getOrCreateEvent();
  const event = await Event.findById(eventId);
  return event || getOrCreateEvent();
}

// Public, player-facing view.
async function getPublicEvent(eventId) {
  const event = await getEventById(eventId);
  const status = event.effectiveStatus();
  return {
    name: event.name,
    description: event.description,
    status,
    startTime: event.startTime,
    endTime: event.endTime,
    duration: event.duration,
    remainingMs: event.remainingMs(),
    leaderboardVisible: event.settings ? event.settings.leaderboardVisible : true,
  };
}

// Full view used by the admin dashboard.
async function getAdminEvent(eventId) {
  const event = await getEventById(eventId);
  return {
    ...event.toObject(),
    effectiveStatus: event.effectiveStatus(),
    remainingMs: event.remainingMs(),
  };
}

// Throws unless the event is currently running (RUNNING or ACTIVE).
function assertEventActive(event) {
  const status = event.effectiveStatus();
  if (status !== EVENT_STATUS.ACTIVE && status !== EVENT_STATUS.RUNNING) {
    const err = new Error(`Event is currently ${status}.`);
    err.status = 409;
    err.code = `EVENT_${status}`;
    throw err;
  }
}

// Admin: start / pause / resume / end.
async function setEventStatus(adminOrId, status, eventIdArg, noteArg) {
  let admin = null;
  let eventId = null;
  let note = noteArg;

  if (adminOrId && adminOrId._id) {
    admin = adminOrId;
    eventId = eventIdArg;
  } else {
    eventId = adminOrId;
    note = status;
  }

  const event = await getEventById(eventId);
  const now = new Date();

  switch (status) {
    case EVENT_STATUS.RUNNING:
    case EVENT_STATUS.ACTIVE: {
      if (event.status === EVENT_STATUS.PAUSED && event.pausedAt) {
        const pausedMs = now - event.pausedAt;
        if (event.endTime) event.endTime = new Date(event.endTime.getTime() + pausedMs);
        event.pausedAt = undefined;
      } else {
        if (!event.startTime) event.startTime = now;
        if (!event.endTime) {
          event.endTime = new Date(now.getTime() + event.duration * 60 * 1000);
        }
      }
      event.status = EVENT_STATUS.RUNNING;
      break;
    }
    case EVENT_STATUS.PAUSED: {
      event.status = EVENT_STATUS.PAUSED;
      event.pausedAt = now;
      break;
    }
    case EVENT_STATUS.ENDED: {
      event.status = EVENT_STATUS.ENDED;
      event.pausedAt = undefined;
      break;
    }
    case EVENT_STATUS.DRAFT:
    case EVENT_STATUS.READY:
    case EVENT_STATUS.NOT_STARTED: {
      event.status = status;
      break;
    }
    default:
      throw Object.assign(new Error("Unknown event status"), { status: 400, code: "VALIDATION_ERROR" });
  }

  await event.save();
  await logAudit(admin, "EVENT_SET_STATUS", "Event", String(event._id), undefined, status, note);
  return event;
}

async function updateEventSettings(admin, patch) {
  const event = await getOrCreateEvent();
  if (patch.name) event.name = patch.name;
  if (patch.description) event.description = patch.description;
  if (patch.theme) event.theme = { ...event.theme, ...patch.theme };
  if (patch.settings) event.settings = { ...event.settings, ...patch.settings };

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
  getEventById,
  getPublicEvent,
  getAdminEvent,
  assertEventActive,
  setEventStatus,
  updateEventSettings,
};
