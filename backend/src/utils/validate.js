const { ApiError } = require("./ApiResponse");

// Tiny validation helpers (beginner-friendly, no extra dependency).
// Usage: validateOrThrow({ teamName: [required, minLen(2)] }, body);

const required = (message = "This field is required") => (v) =>
  v === undefined || v === null || String(v).trim() === "" ? message : null;

const isEmail = (message = "Invalid email address") => (v) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()) ? null : message;

const minLen = (n, message) => (v) =>
  !v || String(v).trim().length >= n ? null : message;

const maxLen = (n, message) => (v) =>
  !v || String(v).trim().length <= n ? null : message;

const isNumber = (message = "Must be a number") => (v) =>
  v === undefined || v === null || !isNaN(Number(v)) ? null : message;

const isBoolean = (message = "Must be true or false") => (v) =>
  v === undefined || v === null || typeof v === "boolean" ? null : message;

const oneOf = (options, message = "Invalid option") => (v) => {
  if (v === undefined || v === null || v === "") return null;
  return options.includes(String(v).toUpperCase()) ? null : message;
};

function validate(rules, body) {
  const errors = {};
  for (const [field, checks] of Object.entries(rules || {})) {
    const value = body[field];
    for (const check of checks) {
      const msg = check(value);
      if (msg) {
        errors[field] = msg;
        break;
      }
    }
  }
  return errors;
}

// Throws an ApiError with all validation messages when any rule fails.
function validateOrThrow(rules, body) {
  const errors = validate(rules, body);
  if (Object.keys(errors).length > 0) {
    const message = Object.entries(errors)
      .map(([f, m]) => `${f}: ${m}`)
      .join(" | ");
    throw new ApiError(message, 400, "VALIDATION_ERROR");
  }
}

module.exports = { required, isEmail, minLen, maxLen, isNumber, isBoolean, oneOf, validate, validateOrThrow };
