const DOMAIN_EVENTS = {
  EVENT_CREATED: "EventCreated",
  EVENT_UPDATED: "EventUpdated",
  EVENT_STARTED: "EventStarted",
  EVENT_PAUSED: "EventPaused",
  EVENT_RESUMED: "EventResumed",
  EVENT_ENDED: "EventEnded",
  EVENT_ARCHIVED: "EventArchived",

  TEAM_REGISTERED: "TeamRegistered",
  TEAM_JOINED_EVENT: "TeamJoinedEvent",
  TEAM_STATUS_CHANGED: "TeamStatusChanged",

  CLUE_ASSIGNED: "ClueAssigned",
  CLUE_UNLOCKED: "ClueUnlocked",
  CLUE_COMPLETED: "ClueCompleted",

  QR_CODE_GENERATED: "QRCodeGenerated",
  QR_CODE_SCANNED: "QRCodeScanned",
  WRONG_QR_CODE_SCANNED: "WrongQRCodeScanned",
  BONUS_QR_CODE_SCANNED: "BonusQRCodeScanned",
  TRAP_QR_CODE_TRIGGERED: "TrapQRCodeTriggered",

  ANSWER_SUBMITTED: "AnswerSubmitted",
  ANSWER_CORRECT: "AnswerCorrect",
  ANSWER_INCORRECT: "AnswerIncorrect",

  SIDE_QUEST_DISCOVERED: "SideQuestDiscovered",
  SIDE_QUEST_COMPLETED: "SideQuestCompleted",

  HINT_USED: "HintUsed",

  POINTS_AWARDED: "PointsAwarded",
  POINTS_DEDUCTED: "PointsDeducted",
  PENALTY_APPLIED: "PenaltyApplied",
  ADMIN_SCORE_ADJUSTED: "AdminScoreAdjusted",

  TEAM_BLOCKED: "TeamBlocked",
  TEAM_UNBLOCKED: "TeamUnblocked",
  ADMIN_TEAM_BLOCKED: "AdminTeamBlocked",
  ADMIN_TEAM_UNBLOCKED: "AdminTeamUnblocked",

  SECRET_CODE_AWARDED: "SecretCodeAwarded",
  FINAL_CLUE_UNLOCKED: "FinalClueUnlocked",
  FINAL_CHALLENGE_UNLOCKED: "FinalChallengeUnlocked",
  FINAL_CHALLENGE_COMPLETED: "FinalChallengeCompleted",

  LEADERBOARD_UPDATED: "LeaderboardUpdated",

  OFFLINE_OPERATION_QUEUED: "OfflineOperationQueued",
  OFFLINE_OPERATION_SYNCED: "OfflineOperationSynced",
  OFFLINE_OPERATION_REJECTED: "OfflineOperationRejected",
};

module.exports = { DOMAIN_EVENTS };
