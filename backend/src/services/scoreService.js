const { Team, ScoreTransaction } = require("../models");

/**
 * Create a score transaction AND update the team's points atomically.
 * Every point change MUST go through this function.
 *
 * @param {ObjectId} teamId
 * @param {string} type - SCORE_TRANSACTION_TYPE value
 * @param {number} points - signed delta (positive = award, negative = penalty)
 * @param {object} opts - { reason, level, clueId, qrId, meta, allowNegative, session }
 * @returns {{ transaction, newPoints }}
 */
async function recordTransaction(teamId, type, points, opts = {}) {
  const { reason = "", level, clueId, qrId, meta = {}, allowNegative = false } = opts;

  const transaction = await ScoreTransaction.create({
    teamId,
    type,
    points,
    reason,
    level,
    clueId,
    qrId,
    meta,
  });

  // Atomic point update: use $inc so concurrent requests are safe.
  // If allowNegative is false, clamp to 0 after update.
  if (!allowNegative && points < 0) {
    // Ensure points don't go below 0
    const team = await Team.findById(teamId);
    const finalPoints = Math.max(0, team.points + points);
    await Team.updateOne({ _id: team._id }, { $set: { points: finalPoints } });
    return { transaction, newPoints: finalPoints };
  }

  const updated = await Team.findByIdAndUpdate(
    teamId,
    { $inc: { points } },
    { new: true }
  );

  return { transaction, newPoints: updated.points };
}

/**
 * Calculate speed bonus based on elapsed time since level started.
 * Returns the bonus points (capped at maxSpeedBonus).
 */
function calculateSpeedBonus(levelStartedAt, settings) {
  if (!settings.speedBonusEnabled || !levelStartedAt) return 0;

  const elapsedMs = Date.now() - new Date(levelStartedAt).getTime();
  const elapsedSec = elapsedMs / 1000;
  const max = Number(settings.speedBonusMax) || 10;

  let bonus = 0;
  const t1 = Number(settings.speedBonusT1) || 120;
  const p1 = Number(settings.speedBonusP1) || 10;
  const t2 = Number(settings.speedBonusT2) || 240;
  const p2 = Number(settings.speedBonusP2) || 5;
  const t3 = Number(settings.speedBonusT3) || 300;
  const p3 = Number(settings.speedBonusP3) || 2;

  if (elapsedSec <= t1) bonus = p1;
  else if (elapsedSec <= t2) bonus = p2;
  else if (elapsedSec <= t3) bonus = p3;
  else bonus = 0;

  return Math.min(bonus, max);
}

/**
 * Get a team's current rank on the leaderboard.
 */
async function getTeamRank(teamId) {
  const team = await Team.findById(teamId).lean();
  if (!team) return null;

  const rank = await Team.countDocuments({
    role: "player",
    $or: [
      { points: { $gt: team.points } },
      {
        points: team.points,
        currentLevel: { $gt: team.currentLevel },
      },
      {
        points: team.points,
        currentLevel: team.currentLevel,
        status: "completed",
        ...(team.status !== "completed" ? { endTime: { $lt: team.endTime || new Date() } } : {}),
      },
    ],
  });

  return rank + 1;
}

/**
 * Get score history for a team (from ScoreTransaction).
 */
async function getScoreHistory(teamId, limit = 100) {
  return ScoreTransaction.find({ teamId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

module.exports = {
  recordTransaction,
  calculateSpeedBonus,
  getTeamRank,
  getScoreHistory,
};
