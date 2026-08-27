const express = require("express");
const router = express.Router();
const { protect, adminOnly, enforceEventIsolation } = require("../middleware/authMiddleware");
const eventService = require("../services/eventService");
const gameService = require("../services/gameService");
const { Event, Team, Clue, SideQuest, QRCode, ScoreTransaction, AuditLog, TeamClueAssignment } = require("../models");
const { eventBus, DOMAIN_EVENTS } = require("../events/eventBus");

// --- Public Event Discovery & Creation ---

router.get("/", async (req, res, next) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
});

router.post("/", protect, adminOnly, async (req, res, next) => {
  try {
    const event = await Event.create(req.body);
    eventBus.publish(DOMAIN_EVENTS.EVENT_CREATED, { eventId: event._id, name: event.name });
    await AuditLog.create({
      eventId: event._id,
      adminId: req.team._id,
      adminName: req.team.teamName,
      action: "CREATE_EVENT",
      note: `Created event ${event.name}`,
    });
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

router.get("/:eventId", protect, enforceEventIsolation, async (req, res, next) => {
  try {
    const event = req.event || await Event.findById(req.params.eventId);
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

router.put("/:eventId", protect, adminOnly, enforceEventIsolation, async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.eventId, req.body, { new: true });
    eventBus.publish(DOMAIN_EVENTS.EVENT_UPDATED, { eventId: event._id });
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

router.delete("/:eventId", protect, adminOnly, enforceEventIsolation, async (req, res, next) => {
  try {
    await Event.findByIdAndDelete(req.params.eventId);
    res.json({ success: true, message: "Event deleted" });
  } catch (err) {
    next(err);
  }
});

router.post("/:eventId/status", protect, adminOnly, enforceEventIsolation, async (req, res, next) => {
  try {
    const { status } = req.body;
    const event = await eventService.setEventStatus(req.team, status, req.params.eventId);
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

// --- Event Scoped Teams & Bulk Team Generation ---

router.get("/:eventId/teams", protect, enforceEventIsolation, async (req, res, next) => {
  try {
    const teams = await Team.find({ eventId: req.params.eventId, role: "player" });
    res.json({ success: true, data: teams });
  } catch (err) {
    next(err);
  }
});

router.post("/:eventId/bulk-teams", protect, adminOnly, enforceEventIsolation, async (req, res, next) => {
  try {
    const count = Number(req.body.count) || 5;
    const prefix = String(req.body.prefix || "TEAM").trim();
    const result = await gameService.bulkGenerateTeams(req.params.eventId, count, prefix, req.team);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post("/:eventId/teams/block", protect, adminOnly, enforceEventIsolation, async (req, res, next) => {
  try {
    const { teamId, block, duration, blockedScanCount, reason } = req.body;
    const team = await gameService.adminToggleBlockTeam(req.params.eventId, teamId, block, { duration, blockedScanCount, reason }, req.team);
    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
});

router.post("/:eventId/teams/score", protect, adminOnly, enforceEventIsolation, async (req, res, next) => {
  try {
    const { teamId, amount, reason } = req.body;
    const result = await gameService.adminAdjustScore(req.params.eventId, teamId, amount, reason, req.team);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// --- Event Scoped Clues, Bulk Upload & Assignments ---

router.get("/:eventId/clues", protect, enforceEventIsolation, async (req, res, next) => {
  try {
    const clues = await Clue.find({ eventId: req.params.eventId }).sort({ clueNumber: 1 });
    res.json({ success: true, data: clues });
  } catch (err) {
    next(err);
  }
});

router.post("/:eventId/clues", protect, adminOnly, enforceEventIsolation, async (req, res, next) => {
  try {
    const clue = await Clue.create({ ...req.body, eventId: req.params.eventId });
    res.status(201).json({ success: true, data: clue });
  } catch (err) {
    next(err);
  }
});

router.post("/:eventId/clues/bulk", protect, adminOnly, enforceEventIsolation, async (req, res, next) => {
  try {
    const cluesArray = Array.isArray(req.body.clues) ? req.body.clues : [];
    const created = [];
    for (const item of cluesArray) {
      const clue = await Clue.create({ ...item, eventId: req.params.eventId });
      created.push(clue);
    }
    await AuditLog.create({
      eventId: req.params.eventId,
      adminId: req.team._id,
      adminName: req.team.teamName,
      action: "BULK_CLUES_CREATED",
      note: `Bulk imported ${created.length} clues`,
    });
    res.status(201).json({ success: true, data: { count: created.length, clues: created } });
  } catch (err) {
    next(err);
  }
});

router.post("/:eventId/generate-assignments", protect, adminOnly, enforceEventIsolation, async (req, res, next) => {
  try {
    const result = await gameService.generateRandomClueAssignments(req.params.eventId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// --- Event Scoped Side Quests & Bulk Upload ---

router.get("/:eventId/side-quests", protect, enforceEventIsolation, async (req, res, next) => {
  try {
    const quests = await SideQuest.find({ eventId: req.params.eventId });
    res.json({ success: true, data: quests });
  } catch (err) {
    next(err);
  }
});

router.post("/:eventId/side-quests", protect, adminOnly, enforceEventIsolation, async (req, res, next) => {
  try {
    const quest = await SideQuest.create({ ...req.body, eventId: req.params.eventId });
    res.status(201).json({ success: true, data: quest });
  } catch (err) {
    next(err);
  }
});

router.post("/:eventId/side-quests/bulk", protect, adminOnly, enforceEventIsolation, async (req, res, next) => {
  try {
    const questsArray = Array.isArray(req.body.quests) ? req.body.quests : [];
    const created = [];
    for (const item of questsArray) {
      const quest = await SideQuest.create({ ...item, eventId: req.params.eventId });
      created.push(quest);
    }
    await AuditLog.create({
      eventId: req.params.eventId,
      adminId: req.team._id,
      adminName: req.team.teamName,
      action: "BULK_SIDE_QUESTS_CREATED",
      note: `Bulk imported ${created.length} side quests`,
    });
    res.status(201).json({ success: true, data: { count: created.length, quests: created } });
  } catch (err) {
    next(err);
  }
});

router.post("/:eventId/side-quests/:questId/complete", protect, enforceEventIsolation, async (req, res, next) => {
  try {
    const { answer } = req.body;
    const result = await gameService.completeSideQuest(req.params.eventId, req.team, req.params.questId, answer);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// --- Final Secret Code Physical Challenge ---

router.post("/:eventId/final-challenge/try-code", protect, enforceEventIsolation, async (req, res, next) => {
  try {
    const { secretCode } = req.body;
    const result = await gameService.tryFinalSecretCode(req.params.eventId, req.team, secretCode);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// --- Event Scoped Leaderboard & Filtered Audit Logs ---

router.get("/:eventId/leaderboard", protect, enforceEventIsolation, async (req, res, next) => {
  try {
    const leaderboardService = require("../services/leaderboardService");
    const data = await leaderboardService.getEventLeaderboard(req.params.eventId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get("/:eventId/audit-logs", protect, adminOnly, enforceEventIsolation, async (req, res, next) => {
  try {
    const { action, search } = req.query;
    const query = { eventId: req.params.eventId };
    if (action) query.action = action;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { note: { $regex: escaped, $options: "i" } },
        { adminName: { $regex: escaped, $options: "i" } },
        { targetId: { $regex: escaped, $options: "i" } },
      ];
    }
    const logs = await AuditLog.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

// --- Event Offline Sync API ---

router.post("/:eventId/sync", protect, enforceEventIsolation, async (req, res, next) => {
  try {
    const { operations } = req.body;
    const results = await gameService.processOfflineSync(req.params.eventId, req.team, operations || []);
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
