const { Team, Clue, QRCode, Submission, QRScan, AuditLog, Event, SideQuest } = require("../models");
const { success } = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { validateOrThrow, required, minLen, isNumber } = require("../utils/validate");
const { DIFFICULTY, ANSWER_TYPE } = require("../utils/constants");
const qrService = require("../services/qrService");
const eventService = require("../services/eventService");
const { frontendUrl } = require("../config/env");

async function resolveEventId(req) {
  const paramEventId = req.query.eventId || req.body?.eventId || req.params?.eventId;
  if (paramEventId) {
    const ev = await Event.findById(paramEventId);
    if (ev) return ev._id;
  }
  if (req.team && req.team.eventId) {
    return req.team.eventId;
  }
  const defaultEvent = await eventService.getOrCreateEvent();
  return defaultEvent._id;
}

async function writeAudit(admin, action, targetType, targetId, oldValue, newValue, note, eventId) {
  await AuditLog.create({
    eventId,
    adminId: admin ? admin._id : undefined,
    adminName: admin ? admin.teamName || admin.email : "Admin",
    action,
    targetType,
    targetId,
    oldValue,
    newValue,
    note,
  });
}

// ---- Dashboard / statistics ------------------------------------------------

const statistics = asyncHandler(async (req, res) => {
  const eventId = await resolveEventId(req);

  const [teamCount, disabledCount, completedCount, scanCount, correctScans, wrongScans, clueCount, submissions] =
    await Promise.all([
      Team.countDocuments({ eventId, role: "player" }),
      Team.countDocuments({ eventId, role: "player", status: "disabled" }),
      Team.countDocuments({ eventId, role: "player", status: "completed" }),
      QRScan.countDocuments({ eventId }),
      QRScan.countDocuments({ eventId, correct: true }),
      QRScan.countDocuments({ eventId, correct: false }),
      Clue.countDocuments({ eventId }),
      Submission.countDocuments({ eventId }),
    ]);

  const totals = await Team.aggregate([
    { $match: { eventId, role: "player" } },
    { $group: { _id: null, points: { $sum: "$points" }, avg: { $avg: "$points" } } },
  ]);

  const event = await eventService.getAdminEvent(eventId);
  const leaderboardService = require("../services/leaderboardService");

  return success(
    res,
    {
      stats: {
        totalTeams: teamCount,
        activeTeams: teamCount - disabledCount - completedCount,
        disabledTeams: disabledCount,
        completedTeams: completedCount,
        totalQRScans: scanCount,
        correctScans,
        wrongScans,
        totalClues: clueCount,
        totalSubmissions: submissions,
        totalPointsAwarded: totals[0] ? totals[0].points : 0,
        averageScore: totals[0] ? Math.round(totals[0].avg * 10) / 10 : 0,
      },
      event,
      leaderboard: (await leaderboardService.getLeaderboard(eventId)).slice(0, 10),
    },
    "Statistics"
  );
});

// ---- Team management -------------------------------------------------------

const listTeams = asyncHandler(async (req, res) => {
  const eventId = await resolveEventId(req);
  const { search, status } = req.query;
  const query = { eventId, role: "player" };
  if (status) query.status = status;
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { teamName: { $regex: escaped, $options: "i" } },
      { teamId: { $regex: escaped, $options: "i" } },
      { "members.fullName": { $regex: escaped, $options: "i" } },
    ];
  }
  const teams = await Team.find(query).sort({ points: -1 });
  return success(res, { teams }, "Teams");
});

const getTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team || team.role !== "player") {
    return res.status(404).json({ success: false, message: "Team not found", code: "NOT_FOUND" });
  }

  const [scans, submissions, audit] = await Promise.all([
    QRScan.find({ eventId: team.eventId, teamId: team._id }).sort({ createdAt: -1 }).lean(),
    Submission.find({ eventId: team.eventId, teamId: team._id }).sort({ createdAt: -1 }).lean(),
    AuditLog.find({ eventId: team.eventId, targetType: "Team", targetId: String(team._id) }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  return success(res, { team: team.toSafeJSON(), scans, submissions, audit }, "Team detail");
});

const toggleTeamStatus = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team || team.role !== "player") {
    return res.status(404).json({ success: false, message: "Team not found", code: "NOT_FOUND" });
  }
  const previous = team.status;
  team.status = team.status === "disabled" ? "active" : "disabled";
  await team.save();
  await writeAudit(req.team, "TEAM_STATUS_CHANGED", "Team", String(team._id), previous, team.status, "Toggled team status", team.eventId);
  return success(res, { status: team.status }, `Team ${team.status}`);
});

const resetTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team || team.role !== "player") {
    return res.status(404).json({ success: false, message: "Team not found", code: "NOT_FOUND" });
  }
  const previous = team.toSafeJSON();
  team.points = 0;
  team.currentClue = 1;
  team.currentLevel = 1;
  team.completedLevels = [];
  team.levelStartedAt = undefined;
  team.clueUnlocked = false;
  team.solvedClues = [];
  team.wrongScans = 0;
  team.lockedClue = false;
  team.hintsUsed = [];
  team.bonusClaimed = [];
  team.status = "active";
  team.endTime = undefined;
  team.finalScore = undefined;
  await team.save();
  await QRScan.deleteMany({ eventId: team.eventId, teamId: team._id });
  await Submission.deleteMany({ eventId: team.eventId, teamId: team._id });
  const { ScoreTransaction } = require("../models");
  await ScoreTransaction.deleteMany({ eventId: team.eventId, teamId: team._id });
  await writeAudit(req.team, "TEAM_RESET", "Team", String(team._id), previous, team.toSafeJSON(), "Reset team progress", team.eventId);
  return success(res, { team: team.toSafeJSON() }, "Team reset");
});

const adjustPoints = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  const delta = Number(req.body.delta);
  if (!team || team.role !== "player") {
    return res.status(404).json({ success: false, message: "Team not found", code: "NOT_FOUND" });
  }
  if (!delta || isNaN(delta)) {
    return res.status(400).json({ success: false, message: "Provide a numeric delta.", code: "VALIDATION_ERROR" });
  }
  const event = await eventService.getEventById(team.eventId);
  const previous = team.points;
  const allowNegative = event.settings ? event.settings.allowNegativeScore : false;
  const newPoints = allowNegative ? team.points + delta : Math.max(0, team.points + delta);
  team.points = newPoints;
  await team.save();

  const { ScoreTransaction } = require("../models");
  await ScoreTransaction.create({
    eventId: team.eventId,
    teamId: team._id,
    type: "ADMIN_ADJUSTMENT",
    points: delta,
    reason: `Admin adjusted by ${delta}`,
    level: team.currentLevel,
    meta: { adminId: req.team._id },
  });

  await writeAudit(req.team, "POINTS_MANUAL", "Team", String(team._id), previous, newPoints, `Adjusted by ${delta}`, team.eventId);
  return success(res, { points: newPoints }, "Points updated");
});

const unlockClue = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team || team.role !== "player") {
    return res.status(404).json({ success: false, message: "Team not found", code: "NOT_FOUND" });
  }
  const previous = { currentClue: team.currentClue, clueUnlocked: team.clueUnlocked, lockedClue: team.lockedClue };
  const clue = await Clue.findOne({ eventId: team.eventId, clueNumber: Number(req.body.clueNumber) });
  if (!clue) {
    return res.status(404).json({ success: false, message: "Clue not found", code: "NOT_FOUND" });
  }
  team.currentClue = clue.clueNumber;
  team.currentLevel = clue.clueNumber;
  team.clueUnlocked = true;
  team.lockedClue = false;
  await team.save();
  await writeAudit(req.team, "CLUE_MANUAL_UNLOCK", "Team", String(team._id), previous, { currentClue: team.currentClue }, `Unlocked clue ${clue.clueNumber}`, team.eventId);
  return success(res, { currentClue: team.currentClue }, "Clue unlocked");
});

// ---- Clue management -------------------------------------------------------

const listClues = asyncHandler(async (req, res) => {
  const eventId = await resolveEventId(req);
  const clues = await Clue.find({ eventId }).sort({ clueNumber: 1 });
  return success(res, { clues }, "Clues");
});

const createClue = asyncHandler(async (req, res) => {
  const eventId = await resolveEventId(req);
  const body = req.body || {};
  validateOrThrow(
    {
      clueNumber: [required("Clue number is required"), isNumber("Clue number must be a number")],
      title: [required("Title is required"), minLen(2, "Title too short")],
      description: [required("Description is required")],
      checkpointName: [required("Checkpoint is required")],
      correctAnswer: [required("Correct answer is required")],
    },
    body
  );
  const exists = await Clue.findOne({ eventId, clueNumber: Number(body.clueNumber) });
  if (exists) {
    return res.status(409).json({ success: false, message: "A clue with this number already exists.", code: "DUPLICATE_KEY" });
  }
  const clue = await Clue.create({
    eventId,
    clueNumber: Number(body.clueNumber),
    title: String(body.title).trim(),
    description: String(body.description).trim(),
    difficulty: body.difficulty || DIFFICULTY.EASY,
    checkpointName: String(body.checkpointName).trim(),
    answerType: body.answerType || ANSWER_TYPE.TEXT,
    correctAnswer: String(body.correctAnswer).trim(),
    acceptedAnswers: (body.acceptedAnswers || []).map((a) => String(a).trim()).filter(Boolean),
    options: (body.options || []).map((o) => String(o).trim()).filter(Boolean),
    points: Number(body.points) || 10,
    hints: Array.isArray(body.hints)
      ? body.hints.map((h) => ({ text: String(h.text || "").trim(), penalty: Number(h.penalty) || 0 }))
      : [],
    maxAttempts: Number(body.maxAttempts) || 3,
    timeLimit: body.timeLimit ? Number(body.timeLimit) : undefined,
    active: body.active !== false,
    isFinal: body.isFinal === true,
    createdBy: req.team._id,
  });
  return success(res, { clue }, "Clue created", 201);
});

const updateClue = asyncHandler(async (req, res) => {
  const clue = await Clue.findById(req.params.id);
  if (!clue) {
    return res.status(404).json({ success: false, message: "Clue not found", code: "NOT_FOUND" });
  }
  const body = req.body || {};
  const previous = clue.toObject();
  const fields = [
    "title", "description", "difficulty", "checkpointName", "answerType",
    "correctAnswer", "acceptedAnswers", "options", "points", "hints",
    "maxAttempts", "timeLimit", "active", "isFinal", "clueNumber",
  ];
  for (const f of fields) {
    if (body[f] === undefined) continue;
    if (f === "points" || f === "maxAttempts") clue[f] = Number(body[f]);
    else if (f === "timeLimit") clue[f] = body[f] ? Number(body[f]) : undefined;
    else if (f === "active" || f === "isFinal") clue[f] = body[f] === true || body[f] === "true";
    else if (f === "hints") clue[f] = body[f].map((h) => ({ text: String(h.text || "").trim(), penalty: Number(h.penalty) || 0 }));
    else clue[f] = body[f];
  }
  await clue.save();
  await writeAudit(req.team, "CLUE_UPDATED", "Clue", String(clue._id), previous, clue.toObject(), "Clue updated", clue.eventId);
  return success(res, { clue }, "Clue updated");
});

const deleteClue = asyncHandler(async (req, res) => {
  const clue = await Clue.findById(req.params.id);
  if (!clue) {
    return res.status(404).json({ success: false, message: "Clue not found", code: "NOT_FOUND" });
  }
  await Clue.deleteOne({ _id: clue._id });
  await QRCode.deleteMany({ eventId: clue.eventId, clueId: clue._id });
  await writeAudit(req.team, "CLUE_DELETED", "Clue", String(clue._id), clue.toObject(), undefined, "Clue deleted", clue.eventId);
  return success(res, {}, "Clue deleted");
});

// ---- QR management ---------------------------------------------------------

const listQRCodes = asyncHandler(async (req, res) => {
  const eventId = await resolveEventId(req);
  const qrs = await QRCode.find({ eventId }).populate("clueId", "clueNumber title").sort({ createdAt: -1 });
  return success(res, { qrcodes: qrs, frontendUrl }, "QR codes");
});

const createQRCode = asyncHandler(async (req, res) => {
  const eventId = await resolveEventId(req);
  const body = req.body || {};
  const clue = body.clueId ? await Clue.findOne({ eventId, _id: body.clueId }) : null;
  if (body.clueId && !clue) {
    return res.status(404).json({ success: false, message: "Clue not found", code: "NOT_FOUND" });
  }
  const qrId = await qrService.uniqueQRId();
  const qr = await QRCode.create({
    eventId,
    qrId,
    clueId: clue ? clue._id : undefined,
    level: clue ? clue.clueNumber : Number(body.level) || 0,
    type: body.type || "NORMAL",
    checkpointName: String(body.checkpointName || (clue ? clue.checkpointName : "")).trim(),
    islandName: String(body.islandName || "").trim() || undefined,
    hintText: String(body.hintText || "").trim(),
    points: Number(body.points) || 0,
    active: body.active !== false,
  });
  await writeAudit(req.team, "QR_CREATED", "QRCode", qrId, undefined, { type: qr.type }, "QR created", eventId);
  return success(res, { qr, url: qrService.qrUrl(qr.qrId) }, "QR code created", 201);
});

const toggleQR = asyncHandler(async (req, res) => {
  const qr = await QRCode.findById(req.params.id);
  if (!qr) {
    return res.status(404).json({ success: false, message: "QR not found", code: "NOT_FOUND" });
  }
  qr.active = !qr.active;
  await qr.save();
  await writeAudit(req.team, "QR_TOGGLED", "QRCode", qr.qrId, !qr.active, qr.active, "Toggled QR active state", qr.eventId);
  return success(res, { qr }, `QR ${qr.active ? "activated" : "deactivated"}`);
});

const generateQR = asyncHandler(async (req, res) => {
  const eventId = await resolveEventId(req);
  const body = req.body || {};
  const clue = body.clueId ? await Clue.findOne({ eventId, _id: body.clueId }) : null;
  if (!clue) {
    return res.status(400).json({ success: false, message: "Select a clue first.", code: "VALIDATION_ERROR" });
  }
  let qr = await QRCode.findOne({ eventId, clueId: clue._id, type: "NORMAL" });
  if (qr) {
    return success(res, { qr, url: qrService.qrUrl(qr.qrId) }, "QR already exists for this clue");
  }
  const qrId = await qrService.uniqueQRId();
  qr = await QRCode.create({
    eventId,
    qrId,
    clueId: clue._id,
    level: clue.clueNumber,
    type: "NORMAL",
    checkpointName: clue.checkpointName,
    active: true,
  });
  await writeAudit(req.team, "QR_GENERATED", "QRCode", qrId, undefined, { clueNumber: clue.clueNumber }, "QR generated for clue", eventId);
  return success(res, { qr, url: qrService.qrUrl(qr.qrId) }, "QR code generated", 201);
});

// ---- Submissions & scans ---------------------------------------------------

const listSubmissions = asyncHandler(async (req, res) => {
  const eventId = await resolveEventId(req);
  const submissions = await Submission.find({ eventId })
    .populate("teamId", "teamName teamId")
    .populate("clueId", "clueNumber title")
    .sort({ createdAt: -1 })
    .limit(300);
  return success(res, { submissions }, "Submissions");
});

const listScans = asyncHandler(async (req, res) => {
  const eventId = await resolveEventId(req);
  const scans = await QRScan.find({ eventId })
    .populate("teamId", "teamName teamId")
    .sort({ createdAt: -1 })
    .limit(300);
  return success(res, { scans }, "Scans");
});

// ---- Event control ---------------------------------------------------------

const eventControl = asyncHandler(async (req, res) => {
  const eventId = await resolveEventId(req);
  const event = await eventService.getAdminEvent(eventId);
  return success(res, { event }, "Event status");
});

const setEventStatus = asyncHandler(async (req, res) => {
  const eventId = await resolveEventId(req);
  const { status } = req.body || {};
  const event = await eventService.setEventStatus(req.team, status, eventId);
  req.app.emit("game-event");
  return success(res, { event }, `Event ${status}`);
});

const updateSettings = asyncHandler(async (req, res) => {
  const event = await eventService.updateEventSettings(req.team, req.body || {});
  return success(res, { event }, "Settings updated");
});

const resetEvent = asyncHandler(async (req, res) => {
  const { allowResetEvent } = require("../config/env");
  if (!allowResetEvent) {
    return res.status(403).json({
      success: false,
      message: "Event reset is disabled.",
      code: "FORBIDDEN",
    });
  }
  const eventId = await resolveEventId(req);
  await eventService.resetEvent(req.team, eventId);
  req.app.emit("game-event");
  return success(res, {}, "Event reset.");
});

// ---- Audit log -------------------------------------------------------------

const listAuditLogs = asyncHandler(async (req, res) => {
  const eventId = await resolveEventId(req);
  const logs = await AuditLog.find({ eventId }).sort({ createdAt: -1 }).limit(200);
  return success(res, { logs }, "Audit logs");
});

module.exports = {
  statistics,
  listTeams,
  getTeam,
  toggleTeamStatus,
  resetTeam,
  adjustPoints,
  unlockClue,
  listClues,
  createClue,
  updateClue,
  deleteClue,
  listQRCodes,
  createQRCode,
  toggleQR,
  generateQR,
  listSubmissions,
  listScans,
  eventControl,
  setEventStatus,
  updateSettings,
  resetEvent,
  listAuditLogs,
};
