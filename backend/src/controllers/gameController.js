const { Team, Clue } = require("../models");
const { success } = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const eventService = require("../services/eventService");
const gameService = require("../services/gameService");
const scoreService = require("../services/scoreService");

function mergeGameResult(result = {}) {
  const { success: _ok, message: _msg, data = {}, ...meta } = result;
  return { ...data, ...meta };
}

const scan = asyncHandler(async (req, res) => {
  const event = await eventService.getOrCreateEvent();
  const result = await gameService.processQRScan(req.team, req.body.qrId, event);
  req.app.emit("game-event");
  return success(res, mergeGameResult(result), result.message);
});

const currentClue = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.team._id);
  const clue = await Clue.findOne({ clueNumber: team.currentClue, active: true });
  if (!clue) {
    return success(res, { clue: null, currentLevel: team.currentLevel }, "No active clue found");
  }
  return success(
    res,
    {
      clue: team.clueUnlocked ? clue.toSafeJSON() : null,
      clueNumber: clue.clueNumber,
      currentLevel: team.currentLevel,
      title: clue.title,
      unlocked: team.clueUnlocked,
      locked: team.lockedClue,
    },
    "Current clue"
  );
});

const answer = asyncHandler(async (req, res) => {
  const event = await eventService.getOrCreateEvent();
  const result = await gameService.submitAnswer(req.team, req.body.clueId, req.body.answer, event);
  req.app.emit("game-event");
  return success(res, mergeGameResult(result), result.message);
});

const hint = asyncHandler(async (req, res) => {
  const event = await eventService.getOrCreateEvent();
  const result = await gameService.useHint(req.team, req.body.clueId, req.body.hintNumber, event);
  req.app.emit("game-event");
  return success(res, mergeGameResult(result), result.message);
});

const scoreHistory = asyncHandler(async (req, res) => {
  const history = await scoreService.getScoreHistory(req.team._id, 100);
  const rank = await scoreService.getTeamRank(req.team._id);
  return success(res, { history, rank }, "Score history");
});

module.exports = { scan, currentClue, answer, hint, scoreHistory };
