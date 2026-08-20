const path = require("path");

// Load .env from the backend folder regardless of where the process starts.
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const required = ["MONGODB_URI", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0 && process.env.NODE_ENV !== "test") {
  console.warn(
    `[env] Missing environment variables: ${missing.join(", ")}. ` +
      "Copy backend/.env.example to backend/.env and fill in the values."
  );
}

module.exports = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || "insecure-dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  clientOrigins: (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  frontendUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173",
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@campus404.org",
    password: process.env.ADMIN_PASSWORD || "Admin@404!",
    name: process.env.ADMIN_NAME || "Event Organizer",
  },
  allowResetEvent: process.env.ALLOW_RESET_EVENT === "true",
};
