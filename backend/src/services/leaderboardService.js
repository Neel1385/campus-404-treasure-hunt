const { Team } = require("../models");
const { TEAM_STATUS } = require("../utils/constants");

// Server-side ranking:
//   1. higher points wins
//   2. on ties, higher current level wins
//   3. on ties, completed teams beat in-progress teams
//   4. on ties, faster completion time wins (completed teams)
//   5. still tied, earlier final completion wins
async function getLeaderboard() {
  const teams = await Team.find({ role: "player" })
    .select("teamName teamId points currentLevel currentClue solvedClues completedLevels status endTime createdAt finalScore wrongScans")
    .lean();

  const sorted = teams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    // Higher level wins on tie
    const aLevel = a.currentLevel || a.currentClue || 1;
    const bLevel = b.currentLevel || b.currentClue || 1;
    if (bLevel !== aLevel) return bLevel - aLevel;

    const aDone = a.status === TEAM_STATUS.COMPLETED;
    const bDone = b.status === TEAM_STATUS.COMPLETED;
    if (aDone && !bDone) return -1;
    if (!aDone && bDone) return 1;
    if (aDone && bDone) return new Date(a.endTime) - new Date(b.endTime);
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  const totalClues = await require("../models").Clue.countDocuments({ active: true });

  return sorted.map((team, index) => ({
    rank: index + 1,
    teamName: team.teamName,
    teamId: team.teamId,
    points: team.points,
    currentLevel: team.currentLevel || team.currentClue || 1,
    totalLevels: totalClues,
    progress: team.solvedClues.length,
    status: team.status,
    completed: team.status === TEAM_STATUS.COMPLETED,
    completionTime: team.endTime,
    wrongScans: team.wrongScans,
  }));
}

module.exports = { getLeaderboard };
