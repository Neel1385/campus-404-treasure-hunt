const express = require("express");
const http = require("http");
const helmet = require("helmet");
const cors = require("cors");
const { initSocket } = require("./socket");
const { connectDB } = require("./config/db");
const { env, port, clientUrl, mongoUri } = require("./config/env");
const { standardLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Routes
const authRoutes = require("./routes/authRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const teamRoutes = require("./routes/teamRoutes");
const gameRoutes = require("./routes/gameRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const qrRoutes = require("./routes/qrRoutes");
const adminRoutes = require("./routes/adminRoutes");
const eventRoutes = require("./routes/eventRoutes");

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/health", (_req, res) =>
  res.json({ success: true, message: "CAMPUS 404 API is running", data: { env } })
);

app.use("/api", standardLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/qrcodes", qrRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventRoutes);

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

async function start() {
  if (!mongoUri) {
    console.error("[server] MONGODB_URI is not set.");
    process.exit(1);
  }
  await connectDB();
  const { getOrCreateEvent } = require("./services/eventService");
  await getOrCreateEvent();

  server.listen(port, () => {
    console.log(`[server] CAMPUS 404 API listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, server, start };
