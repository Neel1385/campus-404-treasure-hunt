const express = require("express");
const { getPublicEvent } = require("../services/eventService");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Public event status (used by players and the landing page).
router.get("/status", asyncHandler(async (_req, res) => {
  const event = await getPublicEvent();
  return res.json({ success: true, data: { event } });
}));

module.exports = router;
