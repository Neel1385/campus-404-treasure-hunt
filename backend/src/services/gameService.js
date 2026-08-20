const { Team, Clue, QRCode, QRScan, Submission } = require("../models");
const { QR_TYPE, TEAM_STATUS, SCORE_TRANSACTION_TYPE } = require("../utils/constants");
const { normalizeAnswer, buildAcceptedList } = require("../utils/answerNormalizer");
const eventService = require("./eventService");
const scoreService = require("./scoreService");

// --- QR scanning ------------------------------------------------------------

async function processQRScan(team, rawQrId, event) {
  eventService.assertEventActive(event);

  if (team.status === TEAM_STATUS.DISABLED) {
    const err = new Error("Your team has been disabled. Contact an organizer.");
    err.status = 403;
    err.code = "TEAM_DISABLED";
    throw err;
  }

  const qrId = String(rawQrId || "").trim().toUpperCase();
  if (!qrId) {
    const err = new Error("No QR code detected.");
    err.status = 400;
    err.code = "BAD_REQUEST";
    throw err;
  }

  const qr = await QRCode.findOne({ qrId });
  const settings = event.settings;

  if (!qr || !qr.active) {
    return handleWrongScan(team, qrId, null, null, event, "Wrong checkpoint. Keep searching.");
  }

  const alreadyScanned = await QRScan.findOne({ teamId: team._id, qrId, correct: true });
  if (alreadyScanned) {
    if (qr.type === QR_TYPE.NORMAL) {
      return {
        success: true,
        correct: false,
        message: "This checkpoint has already been completed.",
        already: true,
        totalPoints: team.points,
      };
    }
    const err = new Error("This QR code has already been used.");
    err.status = 409;
    err.code = "DUPLICATE_SCAN";
    throw err;
  }

  const clue = qr.clueId ? await Clue.findById(qr.clueId) : null;

  switch (qr.type) {
    case QR_TYPE.BONUS: {
      if (!settings.bonusQREnabled) return wrongBecause("Bonus QR codes are disabled.");
      await QRScan.create({ teamId: team._id, qrId, qrType: qr.type, clueId: qr.clueId, correct: true });
      const bonusPoints = qr.points || 0;
      if (bonusPoints > 0) {
        const { newPoints } = await scoreService.recordTransaction(
          team._id,
          SCORE_TRANSACTION_TYPE.BONUS,
          bonusPoints,
          { reason: "Bonus QR scanned", qrId, level: qr.level || team.currentLevel, allowNegative: settings.allowNegativeScore }
        );
        team.points = newPoints;
      }
      return {
        success: true,
        correct: true,
        bonus: true,
        message: `BONUS! +${bonusPoints} points`,
        pointsEarned: bonusPoints,
        totalPoints: team.points,
      };
    }
    case QR_TYPE.TRAP: {
      if (!settings.trapQREnabled) return wrongBecause("Trap QR codes are disabled.");
      const penalty = -(qr.points || 0);
      await QRScan.create({ teamId: team._id, qrId, qrType: qr.type, clueId: qr.clueId, correct: true, penalty: Math.abs(penalty) });
      if (penalty < 0) {
        const { newPoints } = await scoreService.recordTransaction(
          team._id,
          SCORE_TRANSACTION_TYPE.TRAP,
          penalty,
          { reason: "Trap QR scanned", qrId, level: qr.level || team.currentLevel, allowNegative: settings.allowNegativeScore }
        );
        team.points = newPoints;
      }
      return {
        success: true,
        correct: true,
        trap: true,
        message: `TRAP! ${penalty} points lost`,
        pointsLost: Math.abs(penalty),
        totalPoints: team.points,
      };
    }
    case QR_TYPE.HINT: {
      if (!settings.hintQREnabled) return wrongBecause("Hint QR codes are disabled.");
      await QRScan.create({ teamId: team._id, qrId, qrType: qr.type, clueId: qr.clueId, correct: true });
      return {
        success: true,
        correct: true,
        hintQR: true,
        message: "Hint unlocked",
        hint: qr.hintText || "Keep searching around this area.",
      };
    }
    case QR_TYPE.CHECKPOINT: {
      if (!settings.checkpointQREnabled) return wrongBecause("Checkpoint QR codes are disabled.");
      await QRScan.create({ teamId: team._id, qrId, qrType: qr.type, clueId: qr.clueId, correct: true });
      return {
        success: true,
        correct: true,
        checkpoint: true,
        message: `Checkpoint confirmed: ${qr.checkpointName || "location verified"}`,
      };
    }
    case QR_TYPE.ROAD_PONEGLYPH: {
      if (!clue) {
        return handleWrongScan(team, qrId, qr, null, event, "Wrong checkpoint. Keep searching.");
      }

      const qrLevel = qr.level || clue.clueNumber;
      if (qrLevel !== team.currentLevel) {
        return handleWrongScan(team, qrId, qr, clue, event,
          "Wrong checkpoint. This Road Poneglyph is not for your current island.");
      }

      await QRScan.create({ teamId: team._id, qrId, qrType: qr.type, clueId: qr.clueId, correct: true, level: qrLevel });

      const roadPoints = qr.points || Number(settings.correctQRPoints) || Number(settings.pointsPerScan) || 0;
      if (roadPoints > 0) {
        const { newPoints } = await scoreService.recordTransaction(
          team._id,
          SCORE_TRANSACTION_TYPE.ROAD_PONEGLYPH,
          roadPoints,
          { reason: "Road Poneglyph discovered", qrId, clueId: clue._id, level: qrLevel, allowNegative: settings.allowNegativeScore }
        );
        team.points = newPoints;
      }

      team.clueUnlocked = true;
      team.levelStartedAt = new Date();
      await Team.updateOne({ _id: team._id }, { $set: { clueUnlocked: true, levelStartedAt: team.levelStartedAt } });

      return {
        success: true,
        correct: true,
        roadPoneglyph: true,
        message: `ROAD PONEGLYPH DISCOVERED! +${roadPoints} bounty`,
        pointsEarned: roadPoints,
        totalPoints: team.points,
        currentLevel: team.currentLevel,
        clue: clue.toSafeJSON(),
      };
    }
    case QR_TYPE.NORMAL:
    default: {
      if (!clue) {
        return handleWrongScan(team, qrId, qr, null, event, "Wrong checkpoint. Keep searching.");
      }

      const qrLevel = qr.level || clue.clueNumber;
      if (qrLevel !== team.currentLevel) {
        return handleWrongScan(team, qrId, qr, clue, event,
          "Wrong checkpoint. This QR is not available for your current progress.");
      }

      await QRScan.create({ teamId: team._id, qrId, qrType: qr.type, clueId: qr.clueId, correct: true, level: qrLevel });

      const correctQRPoints = Number(settings.correctQRPoints) || Number(settings.pointsPerScan) || 0;
      if (correctQRPoints > 0) {
        const { newPoints } = await scoreService.recordTransaction(
          team._id,
          SCORE_TRANSACTION_TYPE.CORRECT_QR,
          correctQRPoints,
          { reason: "Correct QR scan", qrId, clueId: clue._id, level: qrLevel, allowNegative: settings.allowNegativeScore }
        );
        team.points = newPoints;
      }

      team.clueUnlocked = true;
      team.levelStartedAt = new Date();
      await Team.updateOne({ _id: team._id }, { $set: { clueUnlocked: true, levelStartedAt: team.levelStartedAt } });

      return {
        success: true,
        correct: true,
        message: "Correct checkpoint!",
        pointsEarned: correctQRPoints,
        totalPoints: team.points,
        currentLevel: team.currentLevel,
        clue: clue.toSafeJSON(),
      };
    }
  }
}

function wrongBecause(message) {
  return { success: true, correct: false, message };
}

async function handleWrongScan(team, qrId, qr, clue, event, message) {
  const settings = event.settings;

  await QRScan.create({
    teamId: team._id,
    qrId,
    qrType: qr ? qr.type : "UNKNOWN",
    clueId: qr ? qr.clueId : undefined,
    correct: false,
    penalty: 0,
  });

  const previousScore = team.points;

  let penaltyApplied = 0;
  if (settings.wrongScanPenaltyEnabled) {
    penaltyApplied = Number(settings.wrongScanPenalty) || 0;
    if (penaltyApplied > 0) {
      const { newPoints } = await scoreService.recordTransaction(
        team._id,
        SCORE_TRANSACTION_TYPE.WRONG_QR,
        -penaltyApplied,
        { reason: message, qrId, level: team.currentLevel, allowNegative: settings.allowNegativeScore }
      );
      team.points = newPoints;
    }
  }

  const updateOps = { $inc: { wrongScans: 1 } };
  const newWrongScans = (team.wrongScans || 0) + 1;
  let lockClue = false;
  if (settings.lockAfterMaxWrongScans && settings.maxWrongScans && newWrongScans >= Number(settings.maxWrongScans)) {
    lockClue = true;
    updateOps.$set = { lockedClue: true };
  }

  await Team.updateOne({ _id: team._id }, updateOps);

  return {
    success: true,
    correct: false,
    message,
    pointsLost: penaltyApplied,
    previousScore,
    totalPoints: team.points,
    currentLevel: team.currentLevel,
    wrongScanCount: newWrongScans,
  };
}

// --- Answer submission ------------------------------------------------------

async function submitAnswer(team, clueId, rawAnswer, event) {
  eventService.assertEventActive(event);

  if (team.status === TEAM_STATUS.DISABLED) {
    const err = new Error("Your team has been disabled. Contact an organizer.");
    err.status = 403;
    err.code = "TEAM_DISABLED";
    throw err;
  }

  if (team.status === TEAM_STATUS.COMPLETED) {
    const err = new Error("Mission already complete. Well done!");
    err.status = 409;
    err.code = "ALREADY_COMPLETED";
    throw err;
  }

  if (!clueId || rawAnswer === undefined || rawAnswer === null || String(rawAnswer).trim() === "") {
    const err = new Error("Answer is required.");
    err.status = 400;
    err.code = "BAD_REQUEST";
    throw err;
  }

  const clue = await Clue.findById(clueId);
  if (!clue || !clue.active) {
    const err = new Error("Clue not found.");
    err.status = 404;
    err.code = "CLUE_NOT_FOUND";
    throw err;
  }

  if (clue.clueNumber !== team.currentClue) {
    const err = new Error("You can only answer your current clue.");
    err.status = 409;
    err.code = "WRONG_CLUE";
    throw err;
  }

  if (!team.clueUnlocked) {
    const err = new Error("Scan the correct QR code first to unlock this clue.");
    err.status = 409;
    err.code = "CLUE_LOCKED";
    throw err;
  }

  const attempts = await Submission.countDocuments({ teamId: team._id, clueId });
  const maxAttempts = clue.maxAttempts || event.settings.maxAttemptsPerClue || 3;
  if (attempts >= maxAttempts) {
    await Team.updateOne({ _id: team._id }, { $set: { lockedClue: true } });
    const err = new Error("Maximum attempts reached. This clue is locked - contact an organizer.");
    err.status = 409;
    err.code = "MAX_ATTEMPTS";
    throw err;
  }

  const submitted = normalizeAnswer(clue.answerType, rawAnswer);
  const accepted = buildAcceptedList(clue);
  const isCorrect = accepted.includes(submitted);

  if (isCorrect) {
    return await handleCorrectAnswer(team, clue, event);
  }

  const attemptNumber = attempts + 1;
  await Submission.create({
    teamId: team._id,
    clueId,
    clueNumber: clue.clueNumber,
    answer: String(rawAnswer).trim(),
    correct: false,
    pointsAwarded: 0,
    attemptNumber,
  });

  let penaltyApplied = 0;
  if (event.settings.wrongAnswerPenaltyEnabled && event.settings.wrongAnswerPenalty) {
    penaltyApplied = Number(event.settings.wrongAnswerPenalty) || 0;
    if (penaltyApplied > 0) {
      const { newPoints } = await scoreService.recordTransaction(
        team._id,
        SCORE_TRANSACTION_TYPE.WRONG_ANSWER,
        -penaltyApplied,
        { reason: "Wrong answer", clueId, level: team.currentLevel, meta: { attemptNumber }, allowNegative: event.settings.allowNegativeScore }
      );
      team.points = newPoints;
    }
  }

  let locked = false;
  if (attemptNumber >= maxAttempts) {
    await Team.updateOne({ _id: team._id }, { $set: { lockedClue: true } });
    locked = true;
  }

  return {
    success: true,
    correct: false,
    message: "Incorrect answer. Try again.",
    attemptsLeft: Math.max(0, maxAttempts - attemptNumber),
    penaltyApplied,
    locked,
    previousScore: team.points,
    totalPoints: team.points,
  };
}

async function handleCorrectAnswer(team, clue, event) {
  const guarded = await Team.findOneAndUpdate({ _id: team._id, currentClue: clue.clueNumber }, {}, { new: true });
  if (!guarded) {
    const err = new Error("This clue has already been completed.");
    err.status = 409;
    err.code = "DUPLICATE_SUBMISSION";
    throw err;
  }

  await Submission.create({
    teamId: team._id,
    clueId: clue._id,
    clueNumber: clue.clueNumber,
    answer: "CORRECT_ANSWER",
    correct: true,
    pointsAwarded: clue.points,
  });

  const settings = event.settings;
  let totalPointsEarned = 0;

  if (clue.points > 0) {
    const { newPoints } = await scoreService.recordTransaction(
      team._id,
      SCORE_TRANSACTION_TYPE.CLUE_COMPLETED,
      clue.points,
      { reason: `Clue "${clue.title}" solved`, clueId: clue._id, level: clue.clueNumber, allowNegative: settings.allowNegativeScore }
    );
    team.points = newPoints;
    totalPointsEarned += clue.points;
  }

  const extraCluePoints = Number(settings.clueCompletionPoints) || 0;
  if (extraCluePoints > 0) {
    const { newPoints } = await scoreService.recordTransaction(
      team._id,
      SCORE_TRANSACTION_TYPE.CLUE_COMPLETED,
      extraCluePoints,
      { reason: "Clue completion bonus", clueId: clue._id, level: clue.clueNumber, allowNegative: settings.allowNegativeScore }
    );
    team.points = newPoints;
    totalPointsEarned += extraCluePoints;
  }

  let speedBonus = 0;
  if (team.levelStartedAt) {
    speedBonus = scoreService.calculateSpeedBonus(team.levelStartedAt, settings);
  }
  if (speedBonus > 0) {
    const { newPoints } = await scoreService.recordTransaction(
      team._id,
      SCORE_TRANSACTION_TYPE.SPEED_BONUS,
      speedBonus,
      { reason: "Speed bonus", clueId: clue._id, level: clue.clueNumber, allowNegative: settings.allowNegativeScore }
    );
    team.points = newPoints;
    totalPointsEarned += speedBonus;
  }

  let finalBonus = 0;
  if (clue.isFinal) {
    finalBonus = Number(settings.finalChallengePoints) || 0;
    if (finalBonus > 0) {
      const { newPoints } = await scoreService.recordTransaction(
        team._id,
        SCORE_TRANSACTION_TYPE.FINAL_CHALLENGE,
        finalBonus,
        { reason: "Final challenge completed", clueId: clue._id, level: clue.clueNumber, allowNegative: settings.allowNegativeScore }
      );
      team.points = newPoints;
      totalPointsEarned += finalBonus;
    }
  }

  team.solvedClues.push({
    clueNumber: clue.clueNumber,
    title: clue.title,
    solvedAt: new Date(),
    pointsEarned: totalPointsEarned,
  });

  if (!team.completedLevels.includes(clue.clueNumber)) {
    team.completedLevels.push(clue.clueNumber);
  }

  const nextClue = await Clue.findOne({ clueNumber: clue.clueNumber + 1, active: true });

  if (clue.isFinal || !nextClue) {
    team.status = TEAM_STATUS.COMPLETED;
    team.endTime = new Date();
    team.finalScore = team.points;
    team.clueUnlocked = false;
    team.levelStartedAt = undefined;
    await team.save();

    return {
      success: true,
      correct: true,
      missionComplete: true,
      message: "MISSION COMPLETE!",
      points: team.points,
      finalScore: team.finalScore,
      pointsEarned: totalPointsEarned,
      speedBonus,
      finalBonus,
      totalPoints: team.points,
      completionTime: team.endTime,
      completed: true,
    };
  }

  const newLevel = clue.clueNumber + 1;
  team.currentClue = newLevel;
  team.currentLevel = newLevel;
  team.clueUnlocked = false;
  team.lockedClue = false;
  team.levelStartedAt = undefined;
  await team.save();

  return {
    success: true,
    correct: true,
    message: `Correct! +${totalPointsEarned} points`,
    points: team.points,
    pointsEarned: totalPointsEarned,
    speedBonus,
    levelCompleted: clue.clueNumber,
    newLevel,
    totalPoints: team.points,
    nextClueTitle: nextClue ? nextClue.title : null,
  };
}

// --- Hints ------------------------------------------------------------------

async function useHint(team, clueId, hintNumber, event) {
  eventService.assertEventActive(event);

  if (![1, 2].includes(Number(hintNumber))) {
    const err = new Error("Hint number must be 1 or 2.");
    err.status = 400;
    err.code = "BAD_REQUEST";
    throw err;
  }

  const clue = await Clue.findById(clueId);
  if (!clue || !clue.active) {
    const err = new Error("Clue not found.");
    err.status = 404;
    err.code = "CLUE_NOT_FOUND";
    throw err;
  }

  if (clue.clueNumber !== team.currentClue) {
    const err = new Error("You can only request hints for your current clue.");
    err.status = 409;
    err.code = "WRONG_CLUE";
    throw err;
  }

  if (!team.clueUnlocked) {
    const err = new Error("Scan the correct QR code first to unlock this clue.");
    err.status = 409;
    err.code = "CLUE_LOCKED";
    throw err;
  }

  const already = team.hintsUsed.find((h) => h.clueNumber === clue.clueNumber && h.hintNumber === Number(hintNumber));
  if (already) {
    const err = new Error("This hint has already been used.");
    err.status = 409;
    err.code = "HINT_ALREADY_USED";
    throw err;
  }

  const hint = clue.hints[Number(hintNumber) - 1];
  if (!hint || !hint.text) {
    const err = new Error("Hint not available for this clue.");
    err.status = 404;
    err.code = "HINT_NOT_FOUND";
    throw err;
  }

  let penalty = Number(hint.penalty) || 0;
  if (penalty === 0) {
    const fallbackKey = Number(hintNumber) === 1 ? "hint1Penalty" : "hint2Penalty";
    penalty = Number(event.settings[fallbackKey]) || 0;
  }

  if (penalty > 0) {
    const { newPoints } = await scoreService.recordTransaction(
      team._id,
      SCORE_TRANSACTION_TYPE.HINT_PENALTY,
      -penalty,
      { reason: `Hint ${hintNumber} used`, clueId, level: team.currentLevel, meta: { hintNumber }, allowNegative: event.settings.allowNegativeScore }
    );
    team.points = newPoints;
  }

  team.hintsUsed.push({
    clueNumber: clue.clueNumber,
    hintNumber: Number(hintNumber),
    penalty,
    usedAt: new Date(),
  });
  await team.save();

  return {
    success: true,
    message: `Hint ${hintNumber} used.`,
    hint: hint.text,
    penalty,
    totalPoints: team.points,
  };
}

module.exports = { processQRScan, submitAnswer, useHint };
