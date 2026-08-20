const mongoose = require("mongoose");
const { mongoUri } = require("./env");

async function connectDB() {
  mongoose.set("strictQuery", true);
  const conn = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15000,
  });
  console.log(`[db] MongoDB connected: ${conn.connection.host}`);
  return conn;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
