// Standardized API response shapes.
// Success  -> { success: true, message, data }
// Error    -> { success: false, message, code }

function success(res, data = {}, message = "OK", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function error(res, message = "Something went wrong", status = 500, code = "SERVER_ERROR") {
  return res.status(status).json({ success: false, message, code });
}

class ApiError extends Error {
  constructor(message, status = 500, code = "SERVER_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

module.exports = { success, error, ApiError };
