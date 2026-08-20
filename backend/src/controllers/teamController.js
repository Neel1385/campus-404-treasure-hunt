const { Team, Submission, QRScan, Clue, Event, ScoreTransaction } = require("../models");
const { success } = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const scoreService = require("../services/scoreService");

const me = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.team._id);
  const event = await Event.findOne({});
  const totalClues = await Clue.countDocuments({ active: true });
  const rank = await scoreService.getTeamRank(req.team._id);

  return success(
    res,
    {
      team: team.toSafeJSON(),
      event: event
        ? {
            status: event.effectiveStatus(),
            name: event.name,
            remainingMs: event.remainingMs(),
          }
        : null,
      totalClues,
      totalLevels: totalClues,
      rank,
    },
    "Team dashboard loaded"
  );
});

const history = asyncHandler(async (req, res) => {
  const teamId = req.team._id;

  // Prefer ScoreTransaction if available; fall back to legacy aggregation.
  const transactions = await ScoreTransaction.find({ teamId }).sort({ createdAt: -1 }).limit(200).lean();

  if (transactions.length > 0) {
    const events = transactions.map((t) => ({
      kind: t.type,
      title: t.reason || t.type,
      points: t.points,
      level: t.level,
      at: t.createdAt,
    }));
    return success(res, { history: events }, "Team history loaded");
  }

  // Legacy fallback: build from submissions + scans + hints
  const [submissions, scans, team] = await Promise.all([
    Submission.find({ teamId }).sort({ createdAt: -1 }).limit(200).lean(),
    QRScan.find({ teamId }).sort({ createdAt: -1 }).limit(200).lean(),
    Team.findById(teamId),
  ]);

  const events = [];

  for (const s of submissions) {
    events.push({
      kind: s.correct ? "CLUE_COMPLETED" : "WRONG_ANSWER",
      title: `Clue ${s.clueNumber}`,
      points: s.correct ? s.pointsAwarded : 0,
      level: s.clueNumber,
      at: s.createdAt,
    });
  }

  for (const scan of scans) {
    events.push({
      kind: scan.correct ? "CORRECT_QR" : "WRONG_QR",
      title: scan.correct ? "QR scanned" : "Wrong QR",
      points: scan.correct ? 0 : -scan.penalty,
      at: scan.createdAt,
    });
  }

  for (const h of team.hintsUsed || []) {
    events.push({
      kind: "HINT_PENALTY",
      title: `Clue ${h.clueNumber} - Hint ${h.hintNumber}`,
      points: -h.penalty,
      level: h.clueNumber,
      at: h.usedAt,
    });
  }

  events.sort((a, b) => new Date(b.at) - new Date(a.at));

  return success(res, { history: events }, "Team history loaded");
});

module.exports = { me, history };
