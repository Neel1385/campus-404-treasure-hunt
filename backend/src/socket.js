const { Server } = require("socket.io");

let io = null;

function initSocket(server) {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    socket.on("event:join", ({ eventId }) => {
      if (eventId) {
        socket.join(`event:${eventId}`);
      }
    });

    socket.on("event:leave", ({ eventId }) => {
      if (eventId) {
        socket.leave(`event:${eventId}`);
      }
    });

    // Deprecated global subscribe, maps to joining default room if needed
    socket.on("leaderboard:subscribe", ({ eventId }) => {
      if (eventId) {
        socket.join(`event:${eventId}`);
      }
    });
  });

  return io;
}

function broadcastToEventRoom(eventId, eventName, data) {
  if (io && eventId) {
    io.to(`event:${eventId}`).emit(eventName, data);
  }
}

function broadcastLeaderboardUpdate(eventId) {
  if (io && eventId) {
    io.to(`event:${eventId}`).emit("leaderboard:update", { eventId, at: new Date() });
  }
}

module.exports = { initSocket, broadcastToEventRoom, broadcastLeaderboardUpdate };
