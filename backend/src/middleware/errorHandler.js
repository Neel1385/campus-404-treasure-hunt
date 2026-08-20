const mongoose = require("mongoose");
const { error } = require("../utils/ApiResponse");

// Global error handler - all errors funnel through here.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Mongoose validation errors
  if (err instanceof mongoose.Error.ValidationError) {
    const first = Object.values(err.errors)[0];
    return error(res, first ? first.message : "Validation failed", 400, "VALIDATION_ERROR");
  }

  // Duplicate key (unique field) errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return error(res, `Duplicate value for ${field}.`, 409, "DUPLICATE_KEY");
  }

  // Custom API errors thrown via ApiError
  if (err.status && err.code) {
    return error(res, err.message, err.status, err.code);
  }

  if (err instanceof SyntaxError) {
    return error(res, "Invalid JSON payload.", 400, "BAD_REQUEST");
  }

  console.error("[error]", err);
  return error(res, "Internal server error.", 500, "SERVER_ERROR");
}

// 404 handler for unknown routes.
function notFound(req, res) {
  return error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND");
}

module.exports = { errorHandler, notFound };
