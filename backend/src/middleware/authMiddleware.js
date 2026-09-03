const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const Team = require("../models/Team");
const Event = require("../models/Event");
const { ApiError } = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Validates the JWT and attaches the authenticated team/admin to req.team.
const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw new ApiError("Not authenticated. Please log in.", 401, "UNAUTHORIZED");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (err) {
    throw new ApiError("Session expired or invalid. Please log in again.", 401, "UNAUTHORIZED");
  }

  const team = await Team.findById(decoded.id);
  if (!team) {
    throw new ApiError("Account no longer exists.", 401, "UNAUTHORIZED");
  }

  if (team.role !== "admin" && team.status === "disabled") {
    throw new ApiError("Your team has been disabled. Contact an organizer.", 403, "TEAM_DISABLED");
  }

  req.team = team;
  next();
});

// Enforces that if an eventId parameter is present in the route/body, the team belongs to that event
const enforceEventIsolation = asyncHandler(async (req, _res, next) => {
  const eventId = req.params.eventId || req.body?.eventId || req.query?.eventId;
  if (!eventId) return next();

  // Validate event exists
  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError("Event not found.", 404, "EVENT_NOT_FOUND");
  }
  req.event = event;

  // Admins are bypass
  if (req.team && req.team.role === "admin") {
    return next();
  }

  // Regular teams must match the eventId
  if (req.team && String(req.team.eventId) !== String(eventId)) {
    throw new ApiError("Access denied. Your team is not authorized for this event.", 403, "CROSS_EVENT_FORBIDDEN");
  }

  next();
});

// Must be used AFTER protect. Rejects non-admin accounts.
const adminOnly = (req, _res, next) => {
  if (!req.team || req.team.role !== "admin") {
    return next(new ApiError("Admins only. Access denied.", 403, "FORBIDDEN"));
  }
  next();
};

module.exports = { protect, adminOnly, enforceEventIsolation };
