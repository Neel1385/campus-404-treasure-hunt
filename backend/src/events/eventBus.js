const EventEmitter = require("events");
const { DOMAIN_EVENTS } = require("./eventTypes");

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  publish(eventName, payload) {
    const eventPayload = {
      eventId: payload.eventId || null,
      teamId: payload.teamId || null,
      timestamp: new Date(),
      correlationId: payload.correlationId || `corr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...payload,
    };
    this.emit(eventName, eventPayload);
    this.emit("*", { eventName, payload: eventPayload });
  }
}

const eventBus = new EventBus();

// Core event listeners for audit logging & Socket.IO room emission
eventBus.on("*", async ({ eventName, payload }) => {
  try {
    const { broadcastToEventRoom } = require("../socket");
    if (payload.eventId) {
      broadcastToEventRoom(payload.eventId, "domain:event", { eventName, data: payload });
    }
  } catch (err) {
    // Ignore socket failure in headless mode
  }
});

module.exports = { eventBus, DOMAIN_EVENTS };
