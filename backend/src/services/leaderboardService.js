const { Team, Clue } = require("../models");
const { TEAM_STATUS } = require("../utils/constants");

async function getLeaderboard(eventId) {
  const query = { role: "player" };
  if (eventId) {
    query.eventId = eventId;
  }

  const teams = await Team.find(query)
    .select("teamName teamId points currentLevel currentClue solvedClues completedLevels status endTime createdAt finalScore wrongScans")
    .lean();

  const sorted = teams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

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

  const totalClues = await Clue.countDocuments({ ...(eventId ? { eventId } : {}), active: true });

  return sorted.map((team, index) => ({
    rank: index + 1,
    teamName: team.teamName,
    teamId: team.teamId,
    points: team.points,
    currentLevel: team.currentLevel || team.currentClue || 1,
    totalLevels: totalClues,
    progress: (team.solvedClues || []).length,
    status: team.status,
    completed: team.status === TEAM_STATUS.COMPLETED,
    completionTime: team.endTime,
    wrongScans: team.wrongScans,
  }));
}

async function getEventLeaderboard(eventId) {
  return getLeaderboard(eventId);
}

module.exports = { getLeaderboard, getEventLeaderboard };
