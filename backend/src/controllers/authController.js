const jwt = require("jsonwebtoken");
const { Team, Event } = require("../models");
const { jwtSecret, jwtExpiresIn } = require("../config/env");
const { success, ApiError } = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { validateOrThrow, required, minLen } = require("../utils/validate");

function signToken(team) {
  return jwt.sign({ id: team._id, role: team.role }, jwtSecret, { expiresIn: jwtExpiresIn });
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const event = await Event.findOne({});

  validateOrThrow(
    {
      teamName: [required("Team name is required"), minLen(2, "Team name must be at least 2 characters")],
      leaderName: [required("Team leader name is required")],
      leaderCollegeId: [required("Team leader college ID is required")],
      leaderPhone: [required("Team leader phone number is required")],
      password: [required("Password is required"), minLen(6, "Password must be at least 6 characters")],
      confirmPassword: [required("Please confirm your password")],
    },
    body
  );

  if (body.password !== body.confirmPassword) {
    throw new ApiError("Password confirmation does not match.", 400, "VALIDATION_ERROR");
  }

  const members = [{ fullName: String(body.leaderName).trim(), collegeId: String(body.leaderCollegeId).trim() }];
  const others = Array.isArray(body.members) ? body.members : [];
  for (const m of others) {
    if (m && (m.fullName || m.collegeId)) {
      members.push({ fullName: String(m.fullName || "").trim(), collegeId: String(m.collegeId || "").trim() });
    }
  }

  if (members.length < 3) {
    throw new ApiError("Minimum 3 members required (leader + 2).", 400, "VALIDATION_ERROR");
  }
  const maxSize = event && event.settings ? event.settings.maxTeamSize : 4;
  if (members.length > maxSize) {
    throw new ApiError(`Maximum ${maxSize} members per team.`, 400, "VALIDATION_ERROR");
  }
  if (members.some((m) => !m.fullName || !m.collegeId)) {
    throw new ApiError("Every member needs a full name and college ID.", 400, "VALIDATION_ERROR");
  }

  const existing = await Team.findOne({ teamName: String(body.teamName).trim() });
  if (existing) {
    throw new ApiError("This team name is already taken.", 409, "TEAM_EXISTS");
  }

  // Compact unique team id, e.g. TEAM-A1B2
  let teamId;
  do {
    teamId = `TEAM-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(Math.random() * 10)}`;
  } while (await Team.findOne({ teamId }));

  const team = await Team.create({
    teamId,
    teamName: String(body.teamName).trim(),
    members,
    passwordHash: String(body.password),
    role: "player",
  });

  return success(
    res,
    {
      teamId: team.teamId,
      teamName: team.teamName,
      message: "Registration successful! Your team has been created.",
    },
    "Registration successful",
    201
  );
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) {
    throw new ApiError("Team ID / Name and password are required.", 400, "VALIDATION_ERROR");
  }

  const text = String(identifier).trim();
  const team = await Team.findOne({
    role: "player",
    $or: [{ teamId: text.toUpperCase() }, { teamName: text }],
  }).select("+passwordHash");

  if (!team || !(await team.comparePassword(password))) {
    throw new ApiError("Invalid credentials.", 401, "INVALID_CREDENTIALS");
  }

  if (team.status === "disabled") {
    throw new ApiError("Your team has been disabled. Contact an organizer.", 403, "TEAM_DISABLED");
  }

  // Start the clock the first time the team logs in.
  if (!team.startTime) {
    team.startTime = new Date();
    await team.save();
  }

  const token = signToken(team);
  return success(res, { token, team: team.toSafeJSON() }, "Login successful");
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  return success(res, { team: req.team.toSafeJSON() }, "Authenticated");
});

module.exports = { register, login, me };
