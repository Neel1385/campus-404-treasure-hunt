const rateLimit = require("express-rate-limit");
const { error } = require("../utils/ApiResponse");

// The test suite shares one IP, so keep limits out of the way in NODE_ENV=test.
const isTest = process.env.NODE_ENV === "test";

const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 100000 : 120, // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => error(res, "Too many requests. Please slow down.", 429, "RATE_LIMITED"),
});

// Stricter limiter for auth endpoints (registration, login).
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 100000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => error(res, "Too many attempts. Please wait a minute and try again.", 429, "RATE_LIMITED"),
});

// Stricter limiter for game actions (scan / answer / hint).
const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 100000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => error(res, "Too many game actions. Please slow down.", 429, "RATE_LIMITED"),
});

module.exports = { standardLimiter, authLimiter, gameLimiter };
