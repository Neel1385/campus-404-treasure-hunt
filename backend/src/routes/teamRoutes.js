const express = require("express");
const { me, history } = require("../controllers/teamController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", protect, me);
router.get("/me/history", protect, history);

module.exports = router;
