const express = require("express");
const { scan, currentClue, answer, hint, scoreHistory } = require("../controllers/gameController");
const { protect } = require("../middleware/authMiddleware");
const { gameLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.get("/current-clue", protect, currentClue);
router.post("/scan", protect, gameLimiter, scan);
router.post("/answer", protect, gameLimiter, answer);
router.post("/hint", protect, gameLimiter, hint);
router.get("/score-history", protect, scoreHistory);

module.exports = router;
