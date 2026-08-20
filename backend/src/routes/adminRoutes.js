const express = require("express");
const {
  statistics,
  listTeams,
  getTeam,
  toggleTeamStatus,
  resetTeam,
  adjustPoints,
  unlockClue,
  listClues,
  createClue,
  updateClue,
  deleteClue,
  listQRCodes,
  createQRCode,
  toggleQR,
  generateQR,
  listSubmissions,
  listScans,
  eventControl,
  setEventStatus,
  updateSettings,
  resetEvent,
  listAuditLogs,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Every admin route requires a valid admin JWT.
router.use(protect, adminOnly);

router.get("/statistics", statistics);

router.get("/teams", listTeams);
router.get("/teams/:id", getTeam);
router.patch("/teams/:id/status", toggleTeamStatus);
router.post("/teams/:id/reset", resetTeam);
router.put("/teams/:id/points", adjustPoints);
router.put("/teams/:id/unlock-clue", unlockClue);

router.get("/clues", listClues);
router.post("/clues", createClue);
router.put("/clues/:id", updateClue);
router.delete("/clues/:id", deleteClue);

router.get("/qrcodes", listQRCodes);
router.post("/qrcodes", createQRCode);
router.post("/qrcodes/generate", generateQR);
router.patch("/qrcodes/:id/toggle", toggleQR);

router.get("/submissions", listSubmissions);
router.get("/scans", listScans);

router.get("/event", eventControl);
router.put("/event/status", setEventStatus);
router.put("/event/settings", updateSettings);
router.post("/event/reset", resetEvent);

router.get("/audit", listAuditLogs);

module.exports = router;
