const express = require("express");
const { adminLogin } = require("../controllers/adminAuthController");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/login", authLimiter, adminLogin);

module.exports = router;
