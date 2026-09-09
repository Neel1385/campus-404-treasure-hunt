const mongoose = require("mongoose");
const { Team, Clue } = require("../models");
const { TEAM_STATUS } = require("../utils/constants");

async function getLeaderboard(eventId) {
  const query = { role: "player" };
  if (eventId) {
    query.eventId = eventId;
  }

  const { Event } = require("../models");
  let firstWinnerInfo = null;
  if (eventId) {
    const ev = await Event.findById(eventId).select("firstWinnerTeamId firstWinnerTeamName firstWinnerTimestamp").lean();
    if (ev && ev.firstWinnerTeamId) {
      firstWinnerInfo = {
        firstWinnerTeamId: ev.firstWinnerTeamId,
        firstWinnerTeamName: ev.firstWinnerTeamName,
        firstWinnerTimestamp: ev.firstWinnerTimestamp,
      };
    }
  }

  const teams = await Team.find(query)
    .select("teamName teamId points currentLevel currentClue solvedClues completedLevels status startTime endTime createdAt finalScore wrongScans blocked blockedUntil blockReason treasureCodeSolvedAt isFirstWinner")
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
    if (aDone && bDone) return new Date(a.endTime || a.createdAt) - new Date(b.endTime || b.createdAt);
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  const { TeamClueAssignment } = require("../models");
  const defaultTotalClues = await Clue.countDocuments({ ...(eventId ? { eventId } : {}), active: true });

  // Single batch aggregation for assignment counts across all teams
  const assignmentCounts = await TeamClueAssignment.aggregate([
    { $match: { ...(eventId ? { eventId: new mongoose.Types.ObjectId(String(eventId)) } : {}) } },
    { $group: { _id: "$teamId", count: { $sum: 1 } } },
  ]);

  const assignmentCountMap = new Map();
  for (const item of assignmentCounts) {
    assignmentCountMap.set(String(item._id), item.count);
  }

  return sorted.map((team, index) => {
    const start = team.startTime ? new Date(team.startTime) : new Date(team.createdAt);
    const end = team.endTime ? new Date(team.endTime) : null;
    let completionTimeMs = 0;
    if (team.status === TEAM_STATUS.COMPLETED && end) {
      completionTimeMs = Math.max(0, end.getTime() - start.getTime());
    } else if (start) {
      completionTimeMs = Math.max(0, Date.now() - start.getTime());
    }

    const teamAssignmentsCount = assignmentCountMap.get(String(team._id)) || 0;
    const totalLevels = teamAssignmentsCount > 0 ? teamAssignmentsCount : defaultTotalClues;

    return {
      rank: index + 1,
      id: team._id,
      teamName: team.teamName,
      teamId: team.teamId,
      points: team.points,
      currentLevel: team.currentLevel || team.currentClue || 1,
      totalLevels,
      progress: (team.solvedClues || []).length,
      solvedCluesCount: (team.solvedClues || []).length,
      status: team.status,
      completed: team.status === TEAM_STATUS.COMPLETED,
      startTime: team.startTime || team.createdAt,
      completionTime: team.endTime,
      completionTimeMs,
      wrongScans: team.wrongScans || 0,
      blocked: team.blocked || false,
      blockedUntil: team.blockedUntil,
      blockReason: team.blockReason || "",
      treasureCodeSolvedAt: team.treasureCodeSolvedAt || null,
      isFirstWinner: !!team.isFirstWinner || (firstWinnerInfo && String(firstWinnerInfo.firstWinnerTeamId) === String(team._id)),
      firstWinnerInfo,
    };
  });
}

async function getEventLeaderboard(eventId) {
  return getLeaderboard(eventId);
}

module.exports = { getLeaderboard, getEventLeaderboard };
