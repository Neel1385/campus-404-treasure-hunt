const { MongoMemoryServer } = require("mongodb-memory-server");

async function run() {
  const mongod = await MongoMemoryServer.create({ instance: { port: 27017 } });
  console.log("Memory MongoDB started at:", mongod.getUri());
}

run();
