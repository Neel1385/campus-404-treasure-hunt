// CAMPUS 404 API test suite.
// Runs against an in-memory MongoDB (mongodb-memory-server) via Node's test runner.
// Start with: npm.cmd test   (from the backend folder)

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "campus404-test-secret";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

const { Team, Clue, QRCode, Event, AuditLog } = require("../src/models");
const eventService = require("../src/services/eventService");
const { EVENT_STATUS } = require("../src/utils/constants");

let mongod;
let app;
let adminAccount;

// Mock admin document used for audit-log-friendly admin operations.
const mockAdmin = () => ({ _id: new mongoose.Types.ObjectId(), teamName: "Test Admin", email: "admin@test.com" });

const TEST_ADMIN = {
  email: "admin@test.com",
  password: "Admin@123",
  teamName: "Test Admin",
  teamId: "ADMIN-1",
};

async function seedWorld() {
  // Admin account (seeded the same way scripts/seed.js does it).
  adminAccount = await Team.create({
    teamId: TEST_ADMIN.teamId,
    teamName: TEST_ADMIN.teamName,
    email: TEST_ADMIN.email,
    passwordHash: TEST_ADMIN.password,
    role: "admin",
    members: [
      { fullName: "Organizer One", collegeId: "ORG-1" },
      { fullName: "Organizer Two", collegeId: "ORG-2" },
      { fullName: "Organizer Three", collegeId: "ORG-3" },
    ],
  });

  // Two clues; the second is the FINAL clue.
  const clue1 = await Clue.create({
    clueNumber: 1,
    title: "The Old Library",
    description: "Find the oldest building on campus.",
    difficulty: "EASY",
    checkpointName: "Library Steps",
    answerType: "TEXT",
    correctAnswer: "library",
    acceptedAnswers: ["Library", "LIBRARY", "The Library"],
    points: 10,
    hints: [
      { text: "It smells like old paper.", penalty: 2 },
      { text: "Look behind the statue.", penalty: 5 },
    ],
    maxAttempts: 3,
  });

  const clue2 = await Clue.create({
    clueNumber: 2,
    title: "Main Gate",
    description: "The last door out.",
    difficulty: "FINAL",
    checkpointName: "Main Gate",
    answerType: "TEXT",
    correctAnswer: "main gate",
    acceptedAnswers: ["Main Gate", "The Main Gate"],
    points: 15,
    hints: [{ text: "Big letters, small arch.", penalty: 5 }],
    maxAttempts: 3,
    isFinal: true,
  });

  await QRCode.create([
    { qrId: "AAA111", clueId: clue1._id, type: "NORMAL", checkpointName: "Library Steps", active: true },
    { qrId: "BBB222", clueId: clue2._id, type: "NORMAL", checkpointName: "Main Gate", active: true },
    { qrId: "BONUS1", type: "BONUS", points: 5, active: true },
    { qrId: "TRAP1", type: "TRAP", points: 3, active: true },
  ]);

  // The event starts NOT_STARTED; we start it for the main flow.
  await eventService.setEventStatus(mockAdmin(), EVENT_STATUS.ACTIVE);
}

// Registers a fresh team and returns { token, team }.
async function registerAndLogin(suffix) {
  const teamName = `Team ${suffix}`;
  const password = "secret123";

  await request(app).post("/api/auth/register").send({
    teamName,
    leaderName: `Leader ${suffix}`,
    leaderCollegeId: `L${suffix}ID`,
    leaderPhone: `+1${suffix}`,
    password,
    confirmPassword: password,
    members: [
      { fullName: `Member One ${suffix}`, collegeId: `M1${suffix}ID` },
      { fullName: `Member Two ${suffix}`, collegeId: `M2${suffix}ID` },
    ],
  });

  const res = await request(app).post("/api/auth/login").send({ identifier: teamName, password });
  return { token: res.body.data.token, team: res.body.data.team };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function fetchMe(token) {
  const res = await request(app).get("/api/teams/me").set(auth(token));
  return res.body.data.team;
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: "campus404-test" });

  // Import AFTER connecting so mongoose models share the same connection.
  const { app: application } = require("../src/server");
  app = application;

  await seedWorld();
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

// ---------------------------------------------------------------------------
// Auth & registration
// ---------------------------------------------------------------------------

test("registration creates a team and returns a team id", async () => {
  const res = await request(app).post("/api/auth/register").send({
    teamName: "The Scanners",
    leaderName: "Sam",
    leaderCollegeId: "S123",
    leaderPhone: "+15550001",
    password: "secret123",
    confirmPassword: "secret123",
    members: [
      { fullName: "Ana", collegeId: "A456" },
      { fullName: "Bo", collegeId: "B789" },
    ],
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.match(res.body.data.teamId, /^TEAM-[A-Z0-9]+$/);
  assert.equal(res.body.data.teamName, "The Scanners");
});

test("duplicate team names are rejected", async () => {
  const payload = {
    teamName: "Team Dup",
    leaderName: "Leader Dup",
    leaderCollegeId: "LDUPID",
    leaderPhone: "+15550002",
    password: "secret123",
    confirmPassword: "secret123",
    members: [
      { fullName: "M1 Dup", collegeId: "M1DUPID" },
      { fullName: "M2 Dup", collegeId: "M2DUPID" },
    ],
  };

  const first = await request(app).post("/api/auth/register").send(payload);
  assert.equal(first.status, 201);

  const second = await request(app).post("/api/auth/register").send(payload);
  assert.equal(second.status, 409);
  assert.equal(second.body.code, "TEAM_EXISTS");
});

test("login returns a token and the team dashboard", async () => {
  const { token, team } = await registerAndLogin("Login");
  assert.ok(token);
  assert.equal(team.teamName, "Team Login");
  assert.equal(team.currentClue, 1);
  assert.equal(team.points, 0);
});

test("protected routes reject unauthenticated requests", async () => {
  const res = await request(app).get("/api/teams/me");
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "UNAUTHORIZED");
});

test("players cannot access admin routes", async () => {
  const { token } = await registerAndLogin("PlayerForbidden");
  const res = await request(app).get("/api/admin/statistics").set(auth(token));
  assert.equal(res.status, 403);
  assert.equal(res.body.code, "FORBIDDEN");
});

test("admin login returns an admin token", async () => {
  const res = await request(app).post("/api/admin/auth/login").send({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.admin.role, "admin");
  assert.ok(res.body.data.token);
});

test("admin statistics endpoint works and audits a status change", async () => {
  const login = await request(app).post("/api/admin/auth/login").send({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password,
  });
  const adminToken = login.body.data.token;

  const stats = await request(app).get("/api/admin/statistics").set(auth(adminToken));
  assert.equal(stats.status, 200);
  assert.ok(stats.body.data.stats.totalTeams >= 1);
  assert.ok(Array.isArray(stats.body.data.leaderboard));

  // Toggling a team's status must write an AuditLog entry.
  const { team } = await registerAndLogin("AuditTarget");
  const res = await request(app)
    .patch(`/api/admin/teams/${team.id}/status`)
    .set(auth(adminToken))
    .send({});
  assert.equal(res.status, 200);

  const audit = await request(app).get("/api/admin/audit").set(auth(adminToken));
  const found = audit.body.data.logs.find((l) => l.action === "TEAM_STATUS_CHANGED");
  assert.ok(found, "expected a TEAM_STATUS_CHANGED audit log");
  assert.equal(found.targetId, String(team.id));
});

// ---------------------------------------------------------------------------
// Gameplay
// ---------------------------------------------------------------------------

test("a correct QR scan unlocks the current clue and hides the answer", async () => {
  const { token } = await registerAndLogin("ScanOK");
  const qr = await QRCode.findOne({ qrId: "AAA111" });

  const res = await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.clue.clueNumber, 1);
  assert.equal(res.body.data.clue.correctAnswer, undefined, "answers must never be leaked");
  assert.equal(res.body.data.clue.acceptedAnswers, undefined, "answers must never be leaked");
  assert.equal(qr.qrId, "AAA111");
});

test("current-clue reflects the unlock state", async () => {
  const { token } = await registerAndLogin("CurClue");

  const before = await request(app).get("/api/game/current-clue").set(auth(token));
  assert.equal(before.status, 200);
  assert.equal(before.body.data.unlocked, false);

  await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });

  const after = await request(app).get("/api/game/current-clue").set(auth(token));
  assert.equal(after.status, 200);
  assert.equal(after.body.data.unlocked, true);
  assert.equal(after.body.data.clueNumber, 1);
});

test("wrong QR scans escalate penalties but never drop below zero", async () => {
  const { token } = await registerAndLogin("WrongScan");
  const event = await Event.findOne({});
  assert.equal(event.settings.allowNegativeScore, false);

  const first = await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "ZZZ999" });
  assert.equal(first.status, 200);
  assert.equal(first.body.data.wrongScanCount, 1);

  const second = await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "ZZZ999" });
  assert.equal(second.status, 200);
  assert.equal(second.body.data.wrongScanCount, 2);

  const me = await fetchMe(token);
  assert.equal(me.points, 0, "points should be clamped at zero");
  assert.equal(me.wrongScans, 2);
});

test("scanning the same normal QR twice is idempotent", async () => {
  const { token } = await registerAndLogin("DupScan");

  await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });
  const dup = await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });

  assert.equal(dup.status, 200);
  assert.equal(dup.body.success, true);
  assert.match(dup.body.message, /already/i);
});

test("answers are normalized before comparison", async () => {
  const { token } = await registerAndLogin("NormAnswer");
  const clue = await Clue.findOne({ clueNumber: 1 });

  await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });

  const res = await request(app)
    .post("/api/game/answer")
    .set(auth(token))
    .send({ clueId: String(clue._id), answer: "   LiBrArY   " });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.correct, true);
  assert.equal(res.body.data.points, 10);
});

test("hints apply a penalty and duplicate hints are rejected", async () => {
  const { token } = await registerAndLogin("HintTeam");
  const clue = await Clue.findOne({ clueNumber: 1 });

  await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });

  const hint = await request(app)
    .post("/api/game/hint")
    .set(auth(token))
    .send({ clueId: String(clue._id), hintNumber: 1 });

  assert.equal(hint.status, 200);
  assert.equal(hint.body.data.penalty, 2);
  assert.ok(hint.body.data.hint.length > 0);

  const dup = await request(app)
    .post("/api/game/hint")
    .set(auth(token))
    .send({ clueId: String(clue._id), hintNumber: 1 });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.code, "HINT_ALREADY_USED");
});

test("bonus QR codes award points", async () => {
  const { token } = await registerAndLogin("BonusTeam");

  const res = await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "BONUS1" });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.bonus, true);
  assert.match(res.body.message, /BONUS/);

  const me = await fetchMe(token);
  assert.equal(me.points, 5);
});

test("completing the final clue ends the mission", async () => {
  const { token } = await registerAndLogin("Finisher");
  const clue1 = await Clue.findOne({ clueNumber: 1 });
  const clue2 = await Clue.findOne({ clueNumber: 2 });

  await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });
  await request(app)
    .post("/api/game/answer")
    .set(auth(token))
    .send({ clueId: String(clue1._id), answer: "library" });

  // Next clue is now locked until its QR is scanned.
  const mid = await request(app).get("/api/game/current-clue").set(auth(token));
  assert.equal(mid.body.data.clueNumber, 2);
  assert.equal(mid.body.data.unlocked, false);

  await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "BBB222" });
  const done = await request(app)
    .post("/api/game/answer")
    .set(auth(token))
    .send({ clueId: String(clue2._id), answer: "main gate" });

  assert.equal(done.status, 200);
  assert.equal(done.body.data.missionComplete, true);
  assert.equal(done.body.data.completed, true);
  assert.equal(done.body.data.finalScore, 25);

  const me = await fetchMe(token);
  assert.equal(me.status, "completed");
  assert.equal(me.finalScore, 25);
});

test("game actions are rejected after the event ends", async () => {
  await eventService.setEventStatus(mockAdmin(), EVENT_STATUS.ENDED);

  const { token } = await registerAndLogin("LateTeam");
  const res = await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });

  assert.equal(res.status, 409);
  assert.equal(res.body.code, "EVENT_ENDED");

  // Restore ACTIVE so later tests can keep playing.
  await eventService.setEventStatus(mockAdmin(), EVENT_STATUS.ACTIVE);
});

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

test("leaderboard is computed server-side and ranked by points", async () => {
  const low = await registerAndLogin("BoardLow");
  const high = await registerAndLogin("BoardHigh");

  await request(app).post("/api/game/scan").set(auth(high.token)).send({ qrId: "BONUS1" }); // +5

  const res = await request(app).get("/api/leaderboard");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data.leaderboard));

  const byName = Object.fromEntries(res.body.data.leaderboard.map((t) => [t.teamName, t]));
  assert.ok(byName["Team BoardHigh"].points > byName["Team BoardLow"].points);
  assert.ok(byName["Team BoardHigh"].rank < byName["Team BoardLow"].rank);
  void low;
});

test("audit logs are written when the event is started", async () => {
  const login = await request(app).post("/api/admin/auth/login").send({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password,
  });
  const adminToken = login.body.data.token;

  await eventService.setEventStatus(mockAdmin(), EVENT_STATUS.NOT_STARTED);
  await eventService.setEventStatus(mockAdmin(), EVENT_STATUS.ACTIVE);

  const res = await request(app).get("/api/admin/audit").set(auth(adminToken));
  assert.equal(res.status, 200);
  const actions = res.body.data.logs.map((l) => l.action);
  assert.ok(actions.includes("EVENT_SET_STATUS"));
  assert.equal(await AuditLog.countDocuments({}), res.body.data.logs.length);
});
