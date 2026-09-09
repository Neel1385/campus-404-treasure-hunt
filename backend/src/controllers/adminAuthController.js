const jwt = require("jsonwebtoken");
const { Team } = require("../models");
const { jwtSecret, jwtExpiresIn } = require("../config/env");
const { success, ApiError } = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// POST /api/admin/auth/login
// Admins are seeded (see scripts/seed.js). Player accounts can NEVER log in here.
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    throw new ApiError("Email and password are required.", 400, "VALIDATION_ERROR");
  }

  const inputStr = String(email).trim().toLowerCase();
  const adminAccount = await Team.findOne({
    role: "admin",
    $or: [
      { email: inputStr },
      { teamId: inputStr.toUpperCase() },
      { teamName: String(email).trim() },
    ],
  }).select("+passwordHash");

  if (!adminAccount) {
    throw new ApiError("Invalid admin credentials.", 401, "INVALID_CREDENTIALS");
  }

  let isMatch = false;
  try {
    isMatch = await adminAccount.comparePassword(password);
  } catch {
    /* non-bcrypt hash */
  }

  if (!isMatch && adminAccount.passwordHash === password) {
    isMatch = true;
    adminAccount.passwordHash = password;
    await adminAccount.save();
  }

  if (!isMatch) {
    throw new ApiError("Invalid admin credentials.", 401, "INVALID_CREDENTIALS");
  }

  const token = jwt.sign({ id: adminAccount._id, role: "admin" }, jwtSecret, { expiresIn: jwtExpiresIn });
  return success(
    res,
    {
      token,
      admin: {
        id: adminAccount._id,
        name: adminAccount.teamName,
        email: adminAccount.email,
        role: "admin",
      },
    },
    "Admin login successful"
  );
});

module.exports = { adminLogin };
