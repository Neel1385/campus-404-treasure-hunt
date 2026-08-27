// CAMPUS 404 API Integration Test Suite
// Fully tests Event-Centric, Event-Driven & Offline-First features.

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "campus404-test-secret";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

const { Team, Clue, QRCode, Event, AuditLog, SideQuest, TeamClueAssignment, ScoreTransaction } = require("../src/models");
const eventService = require("../src/services/eventService");
const { EVENT_STATUS } = require("../src/utils/constants");

let mongod;
let app;
let activeEvent;
let adminAccount;

const TEST_ADMIN = {
  email: "admin@test.com",
  password: "Admin@123",
  teamName: "Test Admin",
  teamId: "ADMIN-1",
};

async function seedWorld() {
  activeEvent = await Event.create({
    name: "Campus Hunt 2025",
    status: EVENT_STATUS.RUNNING,
    settings: {
      cluesPerTeam: 2,
      wrongScanPenaltyEnabled: true,
      wrongScanPenalty: 5,
      wrongScanBlockingEnabled: true,
      wrongScanBlockStrategy: "SCAN_COUNT",
      wrongScanBlockThreshold: 2,
      wrongScanBlockedScanCount: 2,
    },
  });

  adminAccount = await Team.create({
    eventId: activeEvent._id,
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

  const clue1 = await Clue.create({
    eventId: activeEvent._id,
    clueNumber: 1,
    title: "The Old Library",
    description: "Find the oldest building on campus.",
    checkpointName: "Library Steps",
    answerType: "TEXT",
    correctAnswer: "library",
    acceptedAnswers: ["Library", "LIBRARY"],
    points: 10,
    hints: [
      { text: "It smells like old paper.", penalty: 2 },
      { text: "Look behind the statue.", penalty: 5 },
    ],
  });

  const clue2 = await Clue.create({
    eventId: activeEvent._id,
    clueNumber: 2,
    title: "Main Gate",
    description: "The last door out.",
    checkpointName: "Main Gate",
    answerType: "TEXT",
    correctAnswer: "main gate",
    acceptedAnswers: ["Main Gate"],
    points: 15,
    isFinal: true,
  });

  await QRCode.create([
    { eventId: activeEvent._id, qrId: "AAA111", clueId: clue1._id, type: "NORMAL", checkpointName: "Library Steps", active: true },
    { eventId: activeEvent._id, qrId: "BBB222", clueId: clue2._id, type: "NORMAL", checkpointName: "Main Gate", active: true },
    { eventId: activeEvent._id, qrId: "DUMMY1", type: "DUMMY", active: true },
    { eventId: activeEvent._id, qrId: "BONUS1", type: "BONUS", points: 5, active: true },
    { eventId: activeEvent._id, qrId: "TRAP1", type: "TRAP", points: 3, active: true },
  ]);

  await SideQuest.create({
    eventId: activeEvent._id,
    title: "Find Hidden Flag",
    description: "Search under bench",
    points: 20,
    answer: "FLAG123",
    secretCodeReward: "SECRET_FRAG_1",
  });
}

async function registerAndLogin(suffix, targetEvent = activeEvent) {
  const teamName = `Team ${suffix}`;
  const password = "secret123";

  const resReg = await request(app).post("/api/auth/register").send({
    eventId: targetEvent._id,
    teamName,
    leaderName: `Leader ${suffix}`,
    leaderCollegeId: `L${suffix}ID`,
    password,
    confirmPassword: password,
    members: [
      { fullName: `Member One ${suffix}`, collegeId: `M1${suffix}ID` },
      { fullName: `Member Two ${suffix}`, collegeId: `M2${suffix}ID` },
    ],
  });

  const res = await request(app).post("/api/auth/login").send({ identifier: teamName, password });
  return { token: res.body.data.token, team: res.body.data.team, raw: resReg.body };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: "campus404-event-test" });

  const { app: application } = require("../src/server");
  app = application;

  await seedWorld();
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

// ---------------------------------------------------------------------------
// Auth & Registration
// ---------------------------------------------------------------------------

test("registration creates a team scoped to eventId", async () => {
  const { team } = await registerAndLogin("Scoped1");
  assert.equal(team.teamName, "Team Scoped1");
  assert.equal(String(team.eventId), String(activeEvent._id));
});

test("login returns token and dashboard", async () => {
  const { token, team } = await registerAndLogin("Login");
  assert.ok(token);
  assert.equal(team.teamName, "Team Login");
});

test("players cannot access admin routes", async () => {
  const { token } = await registerAndLogin("NonAdmin");
  const res = await request(app).get("/api/admin/statistics").set(auth(token));
  assert.equal(res.status, 403);
});

test("admin login returns admin token", async () => {
  const res = await request(app).post("/api/admin/auth/login").send({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.admin.role, "admin");
  assert.ok(res.body.data.token);
});

// ---------------------------------------------------------------------------
// Event Isolation & Clue Assignments
// ---------------------------------------------------------------------------

test("cross-event isolation prevents access to another event data", async () => {
  const eventB = await Event.create({ name: "Event B Secret", status: EVENT_STATUS.RUNNING });
  const { token } = await registerAndLogin("CrossIso");

  const res = await request(app).get(`/api/events/${eventB._id}/leaderboard`).set(auth(token));
  assert.equal(res.status, 403);
  assert.equal(res.body.code, "CROSS_EVENT_FORBIDDEN");
});

test("randomized clue assignments generate correctly", async () => {
  const { team } = await registerAndLogin("ClueAssign");
  const loginRes = await request(app).post("/api/admin/auth/login").send({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password,
  });
  const adminToken = loginRes.body.data.token;

  const res = await request(app)
    .post(`/api/events/${activeEvent._id}/generate-assignments`)
    .set(auth(adminToken));

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const assignments = await TeamClueAssignment.find({ eventId: activeEvent._id, teamId: team.id });
  assert.ok(assignments.length > 0);
});

// ---------------------------------------------------------------------------
// Gameplay & QR Rules
// ---------------------------------------------------------------------------

test("a correct QR scan unlocks clue and hides answer", async () => {
  const { token } = await registerAndLogin("ScanOK");
  const res = await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.clue.clueNumber, 1);
  assert.equal(res.body.data.clue.correctAnswer, undefined);
});

test("scanning same normal QR twice is idempotent", async () => {
  const { token } = await registerAndLogin("DupScan");

  await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });
  const dup = await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });

  assert.equal(dup.status, 200);
  assert.equal(dup.body.success, true);
  assert.match(dup.body.message, /already/i);
});

test("dummy QR scans trigger wrong scan handling", async () => {
  const { token } = await registerAndLogin("DummyScan");
  const res = await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "DUMMY1" });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.correct, false);
});

test("wrong QR blocking engine blocks team after threshold and decrements scans", async () => {
  const { token } = await registerAndLogin("BlockTest");

  // Scan #1 wrong
  await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "WRONG1" });
  // Scan #2 wrong (reaches threshold 2)
  const res = await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "WRONG2" });

  assert.equal(res.body.data.blocked, true);

  const blockedRes = await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });
  assert.equal(blockedRes.status, 403);
  assert.equal(blockedRes.body.code, "TEAM_BLOCKED");
});

test("answers are normalized before comparison", async () => {
  const { token } = await registerAndLogin("NormAnswer");
  const clue = await Clue.findOne({ clueNumber: 1, eventId: activeEvent._id });

  await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });

  const res = await request(app)
    .post("/api/game/answer")
    .set(auth(token))
    .send({ clueId: String(clue._id), answer: "   LiBrArY   " });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.correct, true);
});

test("hints apply a penalty and duplicate hints are rejected", async () => {
  const { token } = await registerAndLogin("HintTeam");
  const clue = await Clue.findOne({ clueNumber: 1, eventId: activeEvent._id });

  await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "AAA111" });

  const hintRes = await request(app)
    .post("/api/game/hint")
    .set(auth(token))
    .send({ clueId: String(clue._id), hintNumber: 1 });

  assert.equal(hintRes.status, 200);
  assert.equal(hintRes.body.data.penalty, 2);
  assert.ok(hintRes.body.data.hint.length > 0);

  const dup = await request(app)
    .post("/api/game/hint")
    .set(auth(token))
    .send({ clueId: String(clue._id), hintNumber: 1 });
  assert.equal(dup.status, 409);
  assert.equal(dup.code || dup.body.code, "HINT_ALREADY_USED");
});

test("bonus QR codes award points and trap QRs deduct points", async () => {
  const { token } = await registerAndLogin("BonusTrapTeam");

  const bonusRes = await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "BONUS1" });
  assert.equal(bonusRes.status, 200);
  assert.equal(bonusRes.body.data.bonus, true);

  const trapRes = await request(app).post("/api/game/scan").set(auth(token)).send({ qrId: "TRAP1" });
  assert.equal(trapRes.status, 200);
  assert.equal(trapRes.body.data.trap, true);
});

test("side quest completion awards secret codes and points", async () => {
  const { token } = await registerAndLogin("SideQuestTeam");
  const quest = await SideQuest.findOne({ eventId: activeEvent._id });

  const res = await request(app)
    .post(`/api/events/${activeEvent._id}/side-quests/${quest._id}/complete`)
    .set(auth(token))
    .send({ answer: "FLAG123" });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.rewardCode, "SECRET_FRAG_1");
  assert.equal(res.body.data.totalPoints, 20);
});

test("admin can adjust team score with audit log and score transaction", async () => {
  const { team } = await registerAndLogin("AdminAdjustTeam");
  const loginRes = await request(app).post("/api/admin/auth/login").send({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password,
  });
  const adminToken = loginRes.body.data.token;

  const res = await request(app)
    .post(`/api/events/${activeEvent._id}/teams/score`)
    .set(auth(adminToken))
    .send({ teamId: team.id, amount: 50, reason: "Bonus reward" });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.newPoints, 50);

  const tx = await ScoreTransaction.findOne({ teamId: team.id, type: "ADMIN_ADJUSTMENT" });
  assert.ok(tx);
  assert.equal(tx.points, 50);
});

test("offline sync API reconciles operations idempotently", async () => {
  const { token } = await registerAndLogin("SyncTeam");

  // Sync batch containing QR scan
  const res = await request(app)
    .post(`/api/events/${activeEvent._id}/sync`)
    .set(auth(token))
    .send({
      operations: [
        { operationId: "op_sync_1", type: "QR_SCANNED", qrId: "AAA111" },
      ],
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].status, "ACCEPTED");
});

test("leaderboard is computed server-side and ranked by points", async () => {
  const low = await registerAndLogin("BoardLow");
  const high = await registerAndLogin("BoardHigh");

  await request(app).post("/api/game/scan").set(auth(high.token)).send({ qrId: "BONUS1" });

  const res = await request(app).get(`/api/events/${activeEvent._id}/leaderboard`).set(auth(high.token));
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));

  const byName = Object.fromEntries(res.body.data.map((t) => [t.teamName, t]));
  assert.ok(byName["Team BoardHigh"].points > byName["Team BoardLow"].points);
  assert.ok(byName["Team BoardHigh"].rank < byName["Team BoardLow"].rank);
});
