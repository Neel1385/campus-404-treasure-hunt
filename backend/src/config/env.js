const path = require("path");

// Load .env from the backend folder regardless of where the process starts.
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("[env] FATAL: JWT_SECRET environment variable is required in production mode.");
}

const required = ["MONGODB_URI", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0 && process.env.NODE_ENV !== "test") {
  console.warn(
    `[env] Missing environment variables: ${missing.join(", ")}. ` +
      "Copy backend/.env.example to backend/.env and fill in the values."
  );
}

const defaultClientUrls = "http://localhost:5173,https://campus404.vercel.app,https://thelosttreasure.vercel.app";
const clientOrigins = (process.env.CLIENT_URL || defaultClientUrls)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

module.exports = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || "insecure-dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || defaultClientUrls,
  clientOrigins: clientOrigins.length > 0 ? clientOrigins : ["*"],
  frontendUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || "https://thelosttreasure.vercel.app",
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@campus404.org",
    password: process.env.ADMIN_PASSWORD || "Admin@404!",
    name: process.env.ADMIN_NAME || "Event Organizer",
  },
  allowResetEvent: process.env.ALLOW_RESET_EVENT === "true",
};
