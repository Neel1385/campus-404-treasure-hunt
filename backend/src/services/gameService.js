const { Team, Clue, QRCode, QRScan, Submission, SideQuest, TeamClueAssignment, AuditLog, ProcessedOperation } = require("../models");
const { QR_TYPE, TEAM_STATUS, SCORE_TRANSACTION_TYPE } = require("../utils/constants");
const { normalizeAnswer, buildAcceptedList } = require("../utils/answerNormalizer");
const eventService = require("./eventService");
const scoreService = require("./scoreService");
const { eventBus, DOMAIN_EVENTS } = require("../events/eventBus");
const { broadcastLeaderboardUpdate } = require("../socket");

// --- Blocking Check Helper ---
async function checkTeamBlocked(team) {
  if (team.blocked) {
    if (team.blockedUntil && new Date() > team.blockedUntil) {
      team.blocked = false;
      team.blockedUntil = undefined;
      team.remainingBlockedScans = 0;
      team.blockReason = "";
      await team.save();
      eventBus.publish(DOMAIN_EVENTS.TEAM_UNBLOCKED, { eventId: team.eventId, teamId: team._id });
      return;
    }

    if (team.remainingBlockedScans && team.remainingBlockedScans > 0) {
      team.remainingBlockedScans -= 1;
      if (team.remainingBlockedScans === 0 && !team.blockedUntil) {
        team.blocked = false;
        team.blockReason = "";
        await team.save();
        eventBus.publish(DOMAIN_EVENTS.TEAM_UNBLOCKED, { eventId: team.eventId, teamId: team._id });
        return;
      }
      await team.save();
    }

    const err = new Error(team.blockReason || "Your team is temporarily blocked from performing game actions.");
    err.status = 403;
    err.code = "TEAM_BLOCKED";
    throw err;
  }
}

// --- Bulk Team Generation ---
async function bulkGenerateTeams(eventId, count = 5, prefix = "TEAM", adminTeam) {
  const generated = [];
  const event = await eventService.getEventById(eventId);

  for (let i = 1; i <= count; i++) {
    let teamId;
    do {
      teamId = `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(Math.random() * 10)}`;
    } while (await Team.findOne({ eventId, teamId }));

    const rawPassword = `pass_${Math.random().toString(36).slice(2, 8)}`;
    const teamName = `Team ${prefix} #${i}`;

    const team = await Team.create({
      eventId,
      teamId,
      teamName,
      passwordHash: rawPassword,
      role: "player",
      members: [
        { fullName: `Leader ${i}`, collegeId: `ID-L${i}` },
        { fullName: `Member A${i}`, collegeId: `ID-A${i}` },
        { fullName: `Member B${i}`, collegeId: `ID-B${i}` },
      ],
    });

    generated.push({
      id: team._id,
      teamId: team.teamId,
      teamName: team.teamName,
      password: rawPassword,
    });
  }

  await AuditLog.create({
    eventId,
    adminId: adminTeam ? adminTeam._id : undefined,
    adminName: adminTeam ? adminTeam.teamName : "Admin",
    action: "BULK_TEAMS_GENERATED",
    note: `Generated ${generated.length} teams for event ${event.name}`,
  });

  return generated;
}

// --- Final Secret Code Try ---
async function tryFinalSecretCode(eventId, team, inputSecretCode) {
  const event = await eventService.getEventById(eventId);
  const settings = event.settings || {};
  const expectedCode = String(settings.finalSecretCode || "CAMPUS404").trim().toUpperCase();
  const enteredCode = String(inputSecretCode || "").trim().toUpperCase();

  if (enteredCode !== expectedCode) {
    return { success: false, correct: false, message: "Incorrect secret code. Check your side quest code fragments!" };
  }

  const bonusPoints = Number(settings.finalChallengePoints) || 100;
  if (bonusPoints > 0) {
    const { newPoints } = await scoreService.recordTransaction(
      team._id,
      SCORE_TRANSACTION_TYPE.FINAL_CHALLENGE,
      bonusPoints,
      { eventId, reason: "Physical Final Treasure Chest Unlocked!" }
    );
    team.points = newPoints;
  }

  team.status = TEAM_STATUS.COMPLETED;
  team.endTime = new Date();
  team.finalScore = team.points;
  await team.save();

  broadcastLeaderboardUpdate(eventId);
  eventBus.publish(DOMAIN_EVENTS.FINAL_CHALLENGE_COMPLETED, { eventId, teamId: team._id, finalScore: team.finalScore });

  return {
    success: true,
    correct: true,
    message: `PHYSICAL TREASURE UNLOCKED! +${bonusPoints} Bonus Treasure Bounty!`,
    totalPoints: team.points,
  };
}

// --- Randomized Clue Assignments ---
async function generateRandomClueAssignments(eventId) {
  const event = await eventService.getEventById(eventId);
  const settings = event.settings || {};
  const cluesPerTeam = settings.cluesPerTeam || 5;

  const allClues = await Clue.find({ eventId, active: true }).sort({ clueNumber: 1 });
  if (allClues.length === 0) {
    throw new Error("No active clues available to assign.");
  }

  let finalClue = null;
  if (settings.finalClueId) {
    finalClue = allClues.find((c) => String(c._id) === String(settings.finalClueId));
  }
  if (!finalClue) {
    finalClue = allClues.find((c) => c.isFinal) || allClues[allClues.length - 1];
  }

  const normalClues = allClues.filter((c) => String(c._id) !== String(finalClue._id));
  const teams = await Team.find({ eventId, role: "player" });

  let assignmentsCreated = 0;

  for (const team of teams) {
    await TeamClueAssignment.deleteMany({ eventId, teamId: team._id });

    let firstClue = null;
    if (settings.fixedFirstClueId) {
      firstClue = normalClues.find((c) => String(c._id) === String(settings.fixedFirstClueId));
    }

    const remainingNormal = normalClues.filter((c) => !firstClue || String(c._id) !== String(firstClue._id));
    const shuffled = [...remainingNormal].sort(() => 0.5 - Math.random());

    const sequenceList = firstClue
      ? [firstClue, ...shuffled.slice(0, Math.max(0, cluesPerTeam - 1))]
      : shuffled.slice(0, Math.min(cluesPerTeam, normalClues.length));

    for (let i = 0; i < sequenceList.length; i++) {
      await TeamClueAssignment.create({
        eventId,
        teamId: team._id,
        clueId: sequenceList[i]._id,
        sequenceNumber: i + 1,
        isFinal: false,
      });
      assignmentsCreated++;
    }

    await TeamClueAssignment.create({
      eventId,
      teamId: team._id,
      clueId: finalClue._id,
      sequenceNumber: sequenceList.length + 1,
      isFinal: true,
    });
    assignmentsCreated++;

    eventBus.publish(DOMAIN_EVENTS.CLUE_ASSIGNED, { eventId, teamId: team._id });
  }

  return { teamsProcessed: teams.length, totalAssignments: assignmentsCreated };
}

// --- QR Scanning ---
async function processQRScan(team, rawQrId, event) {
  eventService.assertEventActive(event);

  if (team.status === TEAM_STATUS.DISABLED) {
    const err = new Error("Your team has been disabled. Contact an organizer.");
    err.status = 403;
    err.code = "TEAM_DISABLED";
    throw err;
  }

  await checkTeamBlocked(team);

  const qrId = String(rawQrId || "").trim().toUpperCase();
  if (!qrId) {
    const err = new Error("No QR code detected.");
    err.status = 400;
    err.code = "BAD_REQUEST";
    throw err;
  }

  const qr = await QRCode.findOne({ eventId: event._id, qrId });
  const settings = event.settings || {};

  if (!qr || !qr.active) {
    return handleWrongScan(team, qrId, null, null, event, "Wrong checkpoint. Keep searching.");
  }

  const clue = qr.clueId ? await Clue.findById(qr.clueId) : null;

  if (qr.type === QR_TYPE.DUMMY) {
    eventBus.publish(DOMAIN_EVENTS.WRONG_QR_CODE_SCANNED, { eventId: event._id, teamId: team._id, qrId });
    return handleWrongScan(team, qrId, qr, null, event, "Dummy QR detected! Nothing useful here.");
  }

  const alreadyScanned = await QRScan.findOne({ eventId: event._id, teamId: team._id, qrId, correct: true });
  if (alreadyScanned) {
    if (qr.type === QR_TYPE.NORMAL || qr.type === QR_TYPE.ROAD_PONEGLYPH) {
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

  switch (qr.type) {
    case QR_TYPE.BONUS: {
      if (!settings.bonusQREnabled) return wrongBecause("Bonus QR codes are disabled.");
      await QRScan.create({ eventId: event._id, teamId: team._id, qrId, qrType: qr.type, clueId: qr.clueId, correct: true });
      const bonusPoints = qr.points || 0;
      if (bonusPoints > 0) {
        const { newPoints } = await scoreService.recordTransaction(
          team._id,
          SCORE_TRANSACTION_TYPE.BONUS,
          bonusPoints,
          { eventId: event._id, reason: "Bonus QR scanned", qrId, level: qr.level || team.currentLevel, allowNegative: settings.allowNegativeScore }
        );
        team.points = newPoints;
      }
      broadcastLeaderboardUpdate(event._id);
      eventBus.publish(DOMAIN_EVENTS.BONUS_QR_CODE_SCANNED, { eventId: event._id, teamId: team._id, points: bonusPoints });
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
      await QRScan.create({ eventId: event._id, teamId: team._id, qrId, qrType: qr.type, clueId: qr.clueId, correct: true, penalty: Math.abs(penalty) });
      if (penalty < 0) {
        const { newPoints } = await scoreService.recordTransaction(
          team._id,
          SCORE_TRANSACTION_TYPE.TRAP,
          penalty,
          { eventId: event._id, reason: "Trap QR scanned", qrId, level: qr.level || team.currentLevel, allowNegative: settings.allowNegativeScore }
        );
        team.points = newPoints;
      }
      broadcastLeaderboardUpdate(event._id);
      eventBus.publish(DOMAIN_EVENTS.TRAP_QR_CODE_TRIGGERED, { eventId: event._id, teamId: team._id, penalty: Math.abs(penalty) });
      return {
        success: true,
        correct: true,
        trap: true,
        message: `TRAP! ${penalty} points lost`,
        pointsLost: Math.abs(penalty),
        totalPoints: team.points,
      };
    }
    case QR_TYPE.HINT:
    case QR_TYPE.CHECKPOINT:
    case QR_TYPE.NORMAL:
    case QR_TYPE.ROAD_PONEGLYPH:
    default: {
      if (!clue) {
        return handleWrongScan(team, qrId, qr, null, event, "Wrong checkpoint. Keep searching.");
      }

      const currentAssignment = await TeamClueAssignment.findOne({
        eventId: event._id,
        teamId: team._id,
        sequenceNumber: team.currentLevel,
      });

      if (currentAssignment) {
        if (String(currentAssignment.clueId) !== String(clue._id)) {
          return handleWrongScan(team, qrId, qr, clue, event, "Wrong checkpoint. This QR is not for your assigned clue sequence.");
        }
      } else if (clue.clueNumber !== team.currentClue) {
        return handleWrongScan(team, qrId, qr, clue, event, "Wrong checkpoint. This QR is not for your current level.");
      }

      await QRScan.create({ eventId: event._id, teamId: team._id, qrId, qrType: qr.type, clueId: qr.clueId, correct: true, level: team.currentLevel });

      const correctPoints = Number(settings.correctQRPoints) || Number(settings.pointsPerScan) || 0;
      if (correctPoints > 0) {
        const { newPoints } = await scoreService.recordTransaction(
          team._id,
          SCORE_TRANSACTION_TYPE.CORRECT_QR,
          correctPoints,
          { eventId: event._id, reason: "Correct QR scan", qrId, clueId: clue._id, level: team.currentLevel, allowNegative: settings.allowNegativeScore }
        );
        team.points = newPoints;
      }

      team.clueUnlocked = true;
      team.levelStartedAt = new Date();
      await Team.updateOne({ _id: team._id }, { $set: { clueUnlocked: true, levelStartedAt: team.levelStartedAt } });

      broadcastLeaderboardUpdate(event._id);
      eventBus.publish(DOMAIN_EVENTS.QR_CODE_SCANNED, { eventId: event._id, teamId: team._id, qrId, clueId: clue._id });

      return {
        success: true,
        correct: true,
        message: "Correct checkpoint unlocked!",
        pointsEarned: correctPoints,
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
  const settings = event.settings || {};

  await QRScan.create({
    eventId: event._id,
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
        { eventId: event._id, reason: message, qrId, level: team.currentLevel, allowNegative: settings.allowNegativeScore }
      );
      team.points = newPoints;
    }
  }

  const newWrongScans = (team.wrongScans || 0) + 1;
  team.wrongScans = newWrongScans;

  if (settings.wrongScanBlockingEnabled) {
    const threshold = Number(settings.wrongScanBlockThreshold) || 3;
    if (newWrongScans >= threshold) {
      team.blocked = true;
      team.blockReason = `Blocked due to ${newWrongScans} wrong QR scans.`;
      if (settings.wrongScanBlockStrategy === "TIME" || settings.wrongScanBlockStrategy === "BOTH") {
        const durationMins = Number(settings.wrongScanBlockDuration) || 5;
        team.blockedUntil = new Date(Date.now() + durationMins * 60 * 1000);
      }
      if (settings.wrongScanBlockStrategy === "SCAN_COUNT" || settings.wrongScanBlockStrategy === "BOTH") {
        team.remainingBlockedScans = Number(settings.wrongScanBlockedScanCount) || 3;
      }
      eventBus.publish(DOMAIN_EVENTS.TEAM_BLOCKED, { eventId: event._id, teamId: team._id, reason: team.blockReason });
    }
  }

  await team.save();
  broadcastLeaderboardUpdate(event._id);
  eventBus.publish(DOMAIN_EVENTS.WRONG_QR_CODE_SCANNED, { eventId: event._id, teamId: team._id, qrId, wrongScans: newWrongScans });

  return {
    success: true,
    correct: false,
    message,
    pointsLost: penaltyApplied,
    previousScore,
    totalPoints: team.points,
    currentLevel: team.currentLevel,
    wrongScanCount: newWrongScans,
    blocked: team.blocked,
  };
}

// --- Answer Submission & Final Challenge ---
async function submitAnswer(team, clueId, rawAnswer, event) {
  eventService.assertEventActive(event);
  await checkTeamBlocked(team);

  if (team.status === TEAM_STATUS.COMPLETED) {
    const err = new Error("Mission already complete. Well done!");
    err.status = 409;
    err.code = "ALREADY_COMPLETED";
    throw err;
  }

  const clue = await Clue.findOne({ eventId: event._id, _id: clueId });
  if (!clue || !clue.active) {
    const err = new Error("Clue not found.");
    err.status = 404;
    err.code = "CLUE_NOT_FOUND";
    throw err;
  }

  const currentAssignment = await TeamClueAssignment.findOne({
    eventId: event._id,
    teamId: team._id,
    sequenceNumber: team.currentLevel,
  });

  if (currentAssignment) {
    if (String(currentAssignment.clueId) !== String(clue._id)) {
      const err = new Error("You can only answer your current assigned clue.");
      err.status = 409;
      err.code = "WRONG_CLUE";
      throw err;
    }
  } else if (clue.clueNumber !== team.currentClue) {
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

  const submitted = normalizeAnswer(clue.answerType, rawAnswer);
  const accepted = buildAcceptedList(clue);
  const isCorrect = accepted.includes(submitted);

  if (isCorrect) {
    return await handleCorrectAnswer(team, clue, event);
  }

  const attempts = await Submission.countDocuments({ eventId: event._id, teamId: team._id, clueId });
  const attemptNumber = attempts + 1;

  await Submission.create({
    eventId: event._id,
    teamId: team._id,
    clueId,
    clueNumber: clue.clueNumber,
    answer: String(rawAnswer).trim(),
    correct: false,
    pointsAwarded: 0,
    attemptNumber,
  });

  return {
    success: true,
    correct: false,
    message: "Incorrect answer. Try again.",
    totalPoints: team.points,
  };
}

async function handleCorrectAnswer(team, clue, event) {
  const alreadySolved = await Submission.findOne({
    eventId: event._id,
    teamId: team._id,
    clueId: clue._id,
    correct: true,
  });
  if (alreadySolved) {
    return {
      success: true,
      correct: true,
      message: "Clue already solved!",
      totalPoints: team.points,
    };
  }

  await Submission.create({
    eventId: event._id,
    teamId: team._id,
    clueId: clue._id,
    clueNumber: clue.clueNumber,
    answer: "CORRECT_ANSWER",
    correct: true,
    pointsAwarded: clue.points,
  });

  let pointsEarned = clue.points || 0;
  if (pointsEarned > 0) {
    const { newPoints } = await scoreService.recordTransaction(
      team._id,
      SCORE_TRANSACTION_TYPE.CLUE_COMPLETED,
      pointsEarned,
      { eventId: event._id, reason: `Clue "${clue.title}" solved`, clueId: clue._id, level: team.currentLevel, allowNegative: event.settings.allowNegativeScore }
    );
    team.points = newPoints;
  }

  team.solvedClues.push({
    clueNumber: clue.clueNumber,
    title: clue.title,
    solvedAt: new Date(),
    pointsEarned,
  });

  const nextAssignment = await TeamClueAssignment.findOne({
    eventId: event._id,
    teamId: team._id,
    sequenceNumber: team.currentLevel + 1,
  });

  const nextClueByNumber = await Clue.findOne({ eventId: event._id, clueNumber: team.currentClue + 1, active: true });

  const isFinalStep = clue.isFinal || (nextAssignment ? false : !nextClueByNumber);

  if (isFinalStep) {
    team.status = TEAM_STATUS.COMPLETED;
    team.endTime = new Date();
    team.finalScore = team.points;
    team.clueUnlocked = false;
    await team.save();

    broadcastLeaderboardUpdate(event._id);
    eventBus.publish(DOMAIN_EVENTS.FINAL_CHALLENGE_COMPLETED, { eventId: event._id, teamId: team._id, finalScore: team.finalScore });

    return {
      success: true,
      correct: true,
      missionComplete: true,
      message: "MISSION COMPLETE!",
      totalPoints: team.points,
      completionTime: team.endTime,
    };
  }

  team.currentLevel += 1;
  team.currentClue = team.currentLevel;
  team.clueUnlocked = false;
  await team.save();

  broadcastLeaderboardUpdate(event._id);
  eventBus.publish(DOMAIN_EVENTS.CLUE_COMPLETED, { eventId: event._id, teamId: team._id, clueId: clue._id });

  return {
    success: true,
    correct: true,
    message: `Correct! +${pointsEarned} points`,
    pointsEarned,
    newLevel: team.currentLevel,
    totalPoints: team.points,
  };
}

// --- Hints ---
async function useHint(team, clueId, hintNumber, event) {
  eventService.assertEventActive(event);
  await checkTeamBlocked(team);

  if (![1, 2].includes(Number(hintNumber))) {
    const err = new Error("Hint number must be 1 or 2.");
    err.status = 400;
    err.code = "BAD_REQUEST";
    throw err;
  }

  const clue = await Clue.findOne({ eventId: event._id, _id: clueId });
  if (!clue || !clue.active) {
    const err = new Error("Clue not found.");
    err.status = 404;
    err.code = "CLUE_NOT_FOUND";
    throw err;
  }

  if (!team.clueUnlocked) {
    const err = new Error("Scan the correct QR code first to unlock this clue.");
    err.status = 409;
    err.code = "CLUE_LOCKED";
    throw err;
  }

  const already = team.hintsUsed.find((h) => String(h.clueNumber) === String(clue.clueNumber) && h.hintNumber === Number(hintNumber));
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
      { eventId: event._id, reason: `Hint ${hintNumber} used`, clueId, level: team.currentLevel, meta: { hintNumber }, allowNegative: event.settings.allowNegativeScore }
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

  broadcastLeaderboardUpdate(event._id);
  eventBus.publish(DOMAIN_EVENTS.HINT_USED, { eventId: event._id, teamId: team._id, clueId, hintNumber });

  return {
    success: true,
    message: `Hint ${hintNumber} used.`,
    hint: hint.text,
    penalty,
    totalPoints: team.points,
  };
}

// --- Side Quest Completion ---
async function completeSideQuest(eventId, team, questId, answer) {
  const quest = await SideQuest.findOne({ eventId, _id: questId });
  if (!quest || !quest.enabled) {
    throw new Error("Side quest not found or disabled.");
  }

  if (team.completedSideQuests.some((id) => String(id) === String(quest._id))) {
    throw new Error("Side quest already completed.");
  }

  if (quest.answer && normalizeAnswer("TEXT", answer) !== normalizeAnswer("TEXT", quest.answer)) {
    return { success: false, message: "Incorrect side quest answer." };
  }

  team.completedSideQuests.push(quest._id);

  if (quest.secretCodeReward) {
    team.collectedSecretFragments.push(quest.secretCodeReward);
  }

  if (quest.points > 0) {
    const { newPoints } = await scoreService.recordTransaction(
      team._id,
      SCORE_TRANSACTION_TYPE.SIDE_QUEST,
      quest.points,
      { eventId, reason: `Side Quest "${quest.title}" completed` }
    );
    team.points = newPoints;
  }

  await team.save();
  broadcastLeaderboardUpdate(eventId);
  eventBus.publish(DOMAIN_EVENTS.SIDE_QUEST_COMPLETED, { eventId, teamId: team._id, questId: quest._id });

  return {
    success: true,
    message: `Side Quest completed! +${quest.points} points`,
    rewardCode: quest.secretCodeReward,
    totalPoints: team.points,
  };
}

// --- Admin Controls ---
async function adminAdjustScore(eventId, teamId, amount, reason, adminTeam) {
  const team = await Team.findOne({ eventId, _id: teamId });
  if (!team) throw new Error("Team not found.");

  const { newPoints } = await scoreService.recordTransaction(
    team._id,
    SCORE_TRANSACTION_TYPE.ADMIN_ADJUSTMENT,
    Number(amount),
    { eventId, reason: reason || "Admin adjustment", adminId: adminTeam._id }
  );

  team.points = newPoints;
  await team.save();

  await AuditLog.create({
    eventId,
    adminId: adminTeam._id,
    adminName: adminTeam.teamName,
    action: "ADMIN_ADJUST_SCORE",
    targetType: "Team",
    targetId: team._id,
    note: `Adjusted score by ${amount}: ${reason}`,
  });

  broadcastLeaderboardUpdate(eventId);
  eventBus.publish(DOMAIN_EVENTS.ADMIN_SCORE_ADJUSTED, { eventId, teamId: team._id, amount, reason });

  return { success: true, newPoints };
}

async function adminToggleBlockTeam(eventId, teamId, block, options = {}, adminTeam) {
  const team = await Team.findOne({ eventId, _id: teamId });
  if (!team) throw new Error("Team not found.");

  team.blocked = !!block;
  if (block) {
    team.blockReason = options.reason || "Blocked by organizer.";
    if (options.duration) {
      team.blockedUntil = new Date(Date.now() + Number(options.duration) * 60 * 1000);
    }
    if (options.blockedScanCount) {
      team.remainingBlockedScans = Number(options.blockedScanCount);
    }
    eventBus.publish(DOMAIN_EVENTS.ADMIN_TEAM_BLOCKED, { eventId, teamId: team._id });
  } else {
    team.blockedUntil = undefined;
    team.remainingBlockedScans = 0;
    team.blockReason = "";
    eventBus.publish(DOMAIN_EVENTS.ADMIN_TEAM_UNBLOCKED, { eventId, teamId: team._id });
  }

  await team.save();

  await AuditLog.create({
    eventId,
    adminId: adminTeam._id,
    adminName: adminTeam.teamName,
    action: block ? "ADMIN_BLOCK_TEAM" : "ADMIN_UNBLOCK_TEAM",
    targetType: "Team",
    targetId: team._id,
    note: options.reason || "",
  });

  return team.toSafeJSON();
}

// --- Offline Synchronization ---
async function processOfflineSync(eventId, team, operations = []) {
  const results = [];
  const event = await eventService.getEventById(eventId);

  for (const op of operations) {
    try {
      const { operationId, type, qrId, clueId, rawAnswer, questId, answer } = op;
      if (!operationId) throw new Error("Missing operationId");

      // Idempotency check using ProcessedOperation
      const existing = await ProcessedOperation.findOne({ eventId, operationId });
      if (existing) {
        results.push({ operationId, status: "ACCEPTED", alreadyProcessed: true, result: existing.result });
        continue;
      }

      // Reload fresh team state before each operation in batch
      const currentTeamState = await Team.findById(team._id);

      let resPayload = null;
      if (type === "QR_SCANNED") {
        resPayload = await processQRScan(currentTeamState, qrId, event);
      } else if (type === "ANSWER_SUBMITTED") {
        resPayload = await submitAnswer(currentTeamState, clueId, rawAnswer, event);
      } else if (type === "SIDE_QUEST_COMPLETED") {
        resPayload = await completeSideQuest(eventId, currentTeamState, questId, answer);
      } else {
        throw new Error(`Unsupported operation type: ${type}`);
      }

      await ProcessedOperation.create({
        eventId,
        teamId: team._id,
        operationId,
        result: resPayload,
      });

      results.push({ operationId, status: "ACCEPTED", result: resPayload });
    } catch (err) {
      results.push({ operationId: op.operationId, status: "ACCEPTED", result: { success: false, message: err.message } });
    }
  }

  return results;
}

module.exports = {
  processQRScan,
  submitAnswer,
  useHint,
  bulkGenerateTeams,
  tryFinalSecretCode,
  generateRandomClueAssignments,
  completeSideQuest,
  adminAdjustScore,
  adminToggleBlockTeam,
  processOfflineSync,
};
