const express = require("express");
const http = require("http");
const helmet = require("helmet");
const cors = require("cors");
const { Server } = require("socket.io");
const { connectDB } = require("./config/db");
const { env, port, clientUrl, clientOrigins, mongoUri } = require("./config/env");
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

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || clientOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "1mb" }));

// Health check (used by Render / uptime monitors).
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
app.use("/api/event", eventRoutes);

app.use(notFound);
app.use(errorHandler);

// Socket.IO for live leaderboard updates (optional; the app works without it).
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("leaderboard:subscribe", () => socket.join("leaderboard"));
});

function broadcastLeaderboardUpdate() {
  io.to("leaderboard").emit("leaderboard:update", { at: new Date() });
}

// Emit a leaderboard refresh whenever a game mutation happens.
app.on("game-event", broadcastLeaderboardUpdate);

async function start() {
  if (!mongoUri) {
    console.error("[server] MONGODB_URI is not set. Copy backend/.env.example to backend/.env first.");
    process.exit(1);
  }
  await connectDB();

  // Ensure the single event document exists.
  const { getOrCreateEvent } = require("./services/eventService");
  await getOrCreateEvent();

  server.listen(port, () => {
    console.log(`[server] CAMPUS 404 API listening on http://localhost:${port}`);
    console.log(`[server] Allowed client: ${clientUrl}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, server, broadcastLeaderboardUpdate, start };
