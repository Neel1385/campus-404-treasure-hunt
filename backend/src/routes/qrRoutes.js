const express = require("express");
const { protect, enforceEventIsolation } = require("../middleware/authMiddleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Player route that turns a scanned QR id into a short description (event-scoped if provided).
router.get("/:id", protect, enforceEventIsolation, asyncHandler(async (req, res) => {
  const { QRCode } = require("../models");
  const eventId = req.query.eventId || req.team.eventId;
  const qr = await QRCode.findOne({ eventId, qrId: String(req.params.id).toUpperCase() });

  if (!qr) {
    return res.status(404).json({ success: false, message: "QR code not found for this event.", code: "QR_NOT_FOUND" });
  }

  return res.json({
    success: true,
    data: {
      qrId: qr.qrId,
      type: qr.type,
      checkpointName: qr.checkpointName,
      active: qr.active,
      branding: qr.branding,
    },
  });
}));

module.exports = router;
