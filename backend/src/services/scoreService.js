const { Team, ScoreTransaction } = require("../models");

async function recordTransaction(teamId, type, points, opts = {}) {
  const { eventId, reason = "", level, clueId, qrId, adminId, meta = {}, allowNegative = false } = opts;

  let team = await Team.findById(teamId);
  if (!team) throw new Error("Team not found");

  const resolvedEventId = eventId || team.eventId;

  const transaction = await ScoreTransaction.create({
    eventId: resolvedEventId,
    teamId,
    type,
    points,
    reason,
    level,
    clueId,
    qrId,
    adminId,
    meta,
  });

  if (!allowNegative && points < 0) {
    const finalPoints = Math.max(0, team.points + points);
    await Team.updateOne({ _id: team._id }, { $set: { points: finalPoints } });
    return { transaction, newPoints: finalPoints };
  }

  const updated = await Team.findByIdAndUpdate(
    teamId,
    { $inc: { points } },
    { new: true }
  );

  return { transaction, newPoints: updated ? updated.points : team.points };
}

function calculateSpeedBonus(levelStartedAt, settings) {
  if (!settings || !settings.speedBonusEnabled || !levelStartedAt) return 0;

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

async function getTeamRank(teamId) {
  const team = await Team.findById(teamId).lean();
  if (!team) return null;

  const rank = await Team.countDocuments({
    eventId: team.eventId,
    role: "player",
    $or: [
      { points: { $gt: team.points } },
      {
        points: team.points,
        currentLevel: { $gt: team.currentLevel },
      },
    ],
  });

  return rank + 1;
}

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
