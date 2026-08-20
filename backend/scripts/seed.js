// CAMPUS 404 database seeder.
//   npm run seed            -> seeds admin + 10 clues + QR codes + 5 sample teams
//   npm run seed -- --admin-only   -> only the admin account
//
// Sample teams log in with password: demo1234

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { connectDB, disconnectDB } = require("../src/config/db");
const { Team, Clue, QRCode } = require("../src/models");
const { admin } = require("../src/config/env");
const qrService = require("../src/services/qrService");

const args = process.argv.slice(2);
const adminOnly = args.includes("--admin-only");

async function seedAdmin() {
  const existing = await Team.findOne({ role: "admin", email: admin.email });
  if (existing) {
    existing.teamName = admin.name;
    existing.passwordHash = admin.password;

    
    await existing.save();
    console.log(`[seed] Admin updated: ${admin.email} (${existing.teamId})`);
    return existing;
  }

  const created = await Team.create({
    teamId: "ADMIN-1",
    teamName: admin.name,
    email: admin.email,
    passwordHash: admin.password,
    role: "admin",
    members: [
      { fullName: "Event Organizer", collegeId: "ORG-0001" },
      { fullName: "Co-Organizer", collegeId: "ORG-0002" },
      { fullName: "Tech Support", collegeId: "ORG-0003" },
    ],
  });
  console.log(`[seed] Admin created: ${admin.email} (${created.teamId})`);
  return created;
}

const clueData = [
  {
    clueNumber: 1,
    title: "The Old Library",
    description: "Find the oldest building on campus. The entrance holds the first clue.",
    difficulty: "EASY",
    checkpointName: "Central Library Steps",
    answerType: "TEXT",
    correctAnswer: "library",
    acceptedAnswers: ["Library", "The Library", "Central Library"],
    points: 10,
    hints: [
      { text: "It smells like old paper and dust.", penalty: 2 },
      { text: "Follow the row of pillars at the main entrance.", penalty: 5 },
    ],
    maxAttempts: 3,
  },
  {
    clueNumber: 2,
    title: "The Canteen Cipher",
    description: "Where hunger meets intellect. The answer hides behind the lunch menu.",
    difficulty: "EASY",
    checkpointName: "Student Cafeteria",
    answerType: "TEXT",
    correctAnswer: "canteen",
    acceptedAnswers: ["Canteen", "Cafeteria", "Food Court"],
    points: 10,
    hints: [
      { text: "Three meals a day happen here.", penalty: 2 },
      { text: "Look for the neon food sign.", penalty: 5 },
    ],
    maxAttempts: 3,
  },
  {
    clueNumber: 3,
    title: "The Clock Tower",
    description: "It watches over the quad. Count the bells at noon.",
    difficulty: "MEDIUM",
    checkpointName: "Clock Tower",
    answerType: "NUMBER",
    correctAnswer: "12",
    acceptedAnswers: ["twelve"],
    options: [],
    points: 15,
    hints: [
      { text: "It strikes the same number as a clock face at noon.", penalty: 3 },
      { text: "Half a day in numbers.", penalty: 5 },
    ],
    maxAttempts: 3,
  },
  {
    clueNumber: 4,
    title: "The Sports Field",
    description: "Goals, wickets and victory laps. The answer is on the scoreboard.",
    difficulty: "MEDIUM",
    checkpointName: "Sports Complex",
    answerType: "TEXT",
    correctAnswer: "stadium",
    acceptedAnswers: ["Stadium", "Ground", "Sports Ground"],
    points: 15,
    hints: [
      { text: "Big games happen here on weekends.", penalty: 3 },
      { text: "It rhymes with 'adium'.", penalty: 5 },
    ],
    maxAttempts: 3,
  },
  {
    clueNumber: 5,
    title: "The Auditorium",
    description: "Silence, spotlights, and a stage. The main hall holds the answer.",
    difficulty: "MEDIUM",
    checkpointName: "Main Auditorium",
    answerType: "TEXT",
    correctAnswer: "auditorium",
    acceptedAnswers: ["Auditorium", "Theatre", "Seminar Hall"],
    points: 15,
    hints: [
      { text: "Talks and concerts share this space.", penalty: 3 },
      { text: "Red velvet seats.", penalty: 5 },
    ],
    maxAttempts: 3,
  },
  {
    clueNumber: 6,
    title: "The Hostel Block",
    description: "Rows of windows, stories of midnight stories. Check the main gate sign.",
    difficulty: "HARD",
    checkpointName: "Hostel Block A",
    answerType: "TEXT",
    correctAnswer: "hostel",
    acceptedAnswers: ["Hostel", "Dormitory", "Residence"],
    points: 20,
    hints: [
      { text: "A home away from home.", penalty: 5 },
      { text: "Where students sleep between classes.", penalty: 8 },
    ],
    maxAttempts: 3,
  },
  {
    clueNumber: 7,
    title: "The Innovation Lab",
    description: "3D printers hum and ideas ignite. The entrance plaque names the room.",
    difficulty: "HARD",
    checkpointName: "Innovation Lab",
    answerType: "TEXT",
    correctAnswer: "lab",
    acceptedAnswers: ["Lab", "Laboratory", "Makerspace"],
    points: 20,
    hints: [
      { text: "Science and gadgets live here.", penalty: 5 },
      { text: "Short for laboratory.", penalty: 8 },
    ],
    maxAttempts: 3,
  },
  {
    clueNumber: 8,
    title: "The Garden Path",
    description: "Green, quiet, and winding. A plaque near the fountain names the spot.",
    difficulty: "HARD",
    checkpointName: "Botanical Garden",
    answerType: "TEXT",
    correctAnswer: "garden",
    acceptedAnswers: ["Garden", "Park", "Green Zone"],
    points: 20,
    hints: [
      { text: "Nature's corner of campus.", penalty: 5 },
      { text: "Flowers and benches.", penalty: 8 },
    ],
    maxAttempts: 3,
  },
  {
    clueNumber: 9,
    title: "The Admin Block",
    description: "Every form begins here. The answer is on the official sign.",
    difficulty: "HARD",
    checkpointName: "Administrative Block",
    answerType: "TEXT",
    correctAnswer: "admin block",
    acceptedAnswers: ["Admin Block", "Administration", "Admin Office"],
    points: 25,
    hints: [
      { text: "Where the principal's office sits.", penalty: 5 },
      { text: "Short for 'administration'.", penalty: 8 },
    ],
    maxAttempts: 3,
  },
  {
    clueNumber: 10,
    title: "The Main Gate",
    description: "The last door out. Your name is written here forever. This is the FINAL clue.",
    difficulty: "FINAL",
    checkpointName: "Main Gate",
    answerType: "TEXT",
    correctAnswer: "main gate",
    acceptedAnswers: ["Main Gate", "The Main Gate", "Front Gate"],
    points: 50,
    hints: [{ text: "Big letters, small arch.", penalty: 10 }],
    maxAttempts: 3,
    isFinal: true,
  },
];

const sampleTeams = [
  { teamName: "Phoenix Runners", teamId: "TEAM-PHOENIX" },
  { teamName: "Byte Raiders", teamId: "TEAM-BYTES" },
  { teamName: "Midnight Hikers", teamId: "TEAM-MIDNIGHT" },
  { teamName: "Cipher Squad", teamId: "TEAM-CIPHER" },
  { teamName: "Trail Blazers", teamId: "TEAM-TRAIL" },
];

async function seedClues() {
  const existing = await Clue.countDocuments({});
  if (existing > 0) {
    console.log(`[seed] ${existing} clue(s) already exist - skipping clue seeding.`);
    return;
  }
  for (const data of clueData) {
    const clue = await Clue.create(data);
    const qrId = await qrService.uniqueQRId();
    await QRCode.create({
      qrId,
      clueId: clue._id,
      type: "NORMAL",
      checkpointName: clue.checkpointName,
      active: true,
    });
    console.log(`[seed] Clue ${clue.clueNumber} "${clue.title}" + QR ${qrId}`);
  }

  // A couple of bonus/trap QRs around campus for flavour.
  const bonusId = await qrService.uniqueQRId();
  await QRCode.create({ qrId: bonusId, type: "BONUS", points: 10, active: true });
  console.log(`[seed] Bonus QR ${bonusId} (+10 pts)`);

  const trapId = await qrService.uniqueQRId();
  await QRCode.create({ qrId: trapId, type: "TRAP", points: 5, active: true });
  console.log(`[seed] Trap QR ${trapId} (-5 pts)`);
}

async function seedTeams() {
  const existing = await Team.countDocuments({ role: "player" });
  if (existing > 0) {
    console.log(`[seed] ${existing} team(s) already exist - skipping team seeding.`);
    return;
  }

  for (let i = 0; i < sampleTeams.length; i++) {
    const t = sampleTeams[i];
    await Team.create({
      teamId: t.teamId,
      teamName: t.teamName,
      passwordHash: "demo1234",
      members: [
        { fullName: `Leader ${i + 1}`, collegeId: `SEED-L${i + 1}` },
        { fullName: `Member ${i + 1}`, collegeId: `SEED-M${i + 1}` },
        { fullName: `Member ${i + 2}`, collegeId: `SEED-N${i + 1}` },
      ],
    });
    console.log(`[seed] Team "${t.teamName}" (${t.teamId}) password: demo1234`);
  }
}

async function run() {
  await connectDB();
  await seedAdmin();

  if (!adminOnly) {
    await seedClues();
    await seedTeams();
  } else {
    console.log("[seed] --admin-only: clues and sample teams skipped.");
  }

  console.log("[seed] Done.");
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
