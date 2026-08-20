const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

// Player route that turns a scanned QR id into a short description.
router.get("/:id", protect, asyncHandler(async (req, res) => {
  const { QRCode } = require("../models");
  const qr = await QRCode.findOne({ qrId: String(req.params.id).toUpperCase() });
  if (!qr) {
    return res.status(404).json({ success: false, message: "QR code not found.", code: "QR_NOT_FOUND" });
  }
  return res.json({
    success: true,
    data: { qrId: qr.qrId, type: qr.type, checkpointName: qr.checkpointName, active: qr.active },
  });
}));

module.exports = router;
