const { success } = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { getLeaderboard } = require("../services/leaderboardService");
const eventService = require("../services/eventService");

// GET /api/leaderboard
const leaderboard = asyncHandler(async (req, res) => {
  const event = await eventService.getPublicEvent();
  const board = await getLeaderboard();
  return success(res, { leaderboard: board, event }, "Leaderboard");
});

module.exports = { leaderboard };
