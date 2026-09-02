# 🏴‍☠️ CAMPUS 404 — SYSTEM DOCUMENTATION & ARCHITECTURE GUIDE

---

## 🎯 1. ARCHITECTURE OVERVIEW

CAMPUS 404 is an **event-centric, event-driven, and offline-first** QR code treasure hunt application built on the MERN stack (MongoDB, Express, React/Vite, Node.js, Socket.IO).

### **Core Principles:**
1. **Event Scoping:** Every entity (`Team`, `Clue`, `QRCode`, `QRScan`, `Submission`, `ScoreTransaction`, `AuditLog`, `SideQuest`, `TeamClueAssignment`, `ProcessedOperation`) contains a required `eventId` field. Cross-event data access is strictly blocked server-side (`enforceEventIsolation` middleware).
2. **Randomized Clue Pools:** Organizers upload a pool of clues. The system randomly assigns $N$ clues per team while reserving a universal final clue for the terminal objective.
3. **Wrong-Scan Blocking Engine:** Automated blocking enforces temporary penalties when teams scan excessive wrong QRs within configurable time windows.
4. **Offline-First Storage:** Player actions queue in IndexedDB (`Campus404OfflineDB`) when campus Wi-Fi drops and reconcile via `/api/events/:eventId/sync` using `ProcessedOperation` deduplication.
5. **Real-time Isolation:** Socket.IO events broadcast exclusively to room `event:<eventId>`.

---

## 🛠 2. ADMIN CONTROL PANEL MODULES & UI CONTROLS

### **A. Global Event Selector Bar (Header)**
- **Dropdown Selector:** Switch active event context across all tabs.
- **Active Event Badge:** Displays active `eventId`.

### **B. Overview & Events Tab (`⚓ Overview & Events`)**
- **`+ Create Event` Button:** Launch a new hunt event instance.
- **`Start / Resume`, `Pause`, `Ended` Buttons:** Manage event lifecycles.
- **`🎲 Generate Clue Assignments` Button:** Randomly assigns clue sequences to all registered teams based on `Clues Per Team`.
- **`🗑️ Delete Event` Button:** Opens deletion modal with selective checkboxes to purge associated teams, clues, QRs, logs, or side quests.
- **Rules & Config Form:**
  - **`Clues Per Team` Input:** Set maximum assigned clues per team.
  - **`Physical Treasure Secret Code` Textbox:** Master code for opening the physical chest.
  - **`Enable Physical Secret Code Form` Checkbox:** Toggle physical code form on player dashboard.
  - **`Rules & Regulations` Textarea:** Enter player guidelines visible on player dashboards.
  - **`Dynamic Website Theme` Color Pickers:** Choose Primary, Accent Gold, and Background colors per event.

### **C. Teams Control Tab (`🏴‍☠️ Teams Control`)**
- **`+ Add Single Team` Button:** Manually register an individual team (`Team Name`, `Team ID`, `Password`).
- **`Bulk Count` Input & `⚡ Bulk Generate Teams` Button:** Instantly create $N$ team accounts with auto-generated credentials.
- **`Search team...` Textbox:** Filter teams by name or ID.
- **Per-Team Card Controls:**
  - **`delta` Input & `Adjust` Button:** Modify team score manually with audit logging.
  - **`new pass` Input & `Set Pass` Button:** Change team password.
  - **`clue#` Input & `Unlock` Button:** Force unlock a specific clue for a team.
  - **`Reset` Button:** Reset team progress back to Level 1.

### **D. Clues & Pool Tab (`📜 Clues & Pool`)**
- **`+ New Clue` Button:** Add individual clue with title, checkpoint, description, answer, and hints.
- **`⚡ Bulk Upload Clues` Button:** Opens text area supporting JSON or CSV upload. Click **`📄 Demo JSON`** or **`📊 Demo CSV`** for sample templates.
- **`📥 Download All Clues` Button:** Export event clues into a CSV spreadsheet.
- **`Make Final` Toggle Button:** Mark or unmark a clue as the final treasure clue.

### **E. QR Codes Tab (`🗺️ QR Codes`)**
- **Dropdown & `Generate QR` Button:** Generate a QR code linked to a clue.
- **`Logo Image URL` & `Overlay Description Text` Inputs:** Add custom branding overlays.
- **`⚡ Bulk QR Generator` Controls:** Mass generate Dummy, Trap (points penalty), or Bonus (points award) QR codes.
- **`📥 Download All QR Codes` Button:** Export QR codes into a CSV spreadsheet.

### **F. Side Quests Tab (`🎯 Side Quests`)**
- **`+ Create Side Quest` Form:** Create extra riddles with point rewards and `Secret Code Fragment Rewards` (e.g. `X7`).
- **`⚡ Bulk Upload Side Quests` Button:** Upload side quests via JSON or CSV with demo templates.

### **G. Activity Log Tab (`📋 Activity Log`)**
- **`Action Type` Dropdown:** Filter audit logs by action type (`POINTS_MANUAL`, `ADMIN_ADJUST_SCORE`, `CLUE_CREATED`, etc.).
- **`Search activity note/admin...` Textbox:** Text search through log notes.

---

## 🏴‍☠️ 3. HOW TEAMS GET THEIR FIRST CLUE & GAMEPLAY FLOW

### **How Teams Obtain Their First Clue:**
1. **Organizer Sequence Assignment:**
   - In the Admin Panel (`⚓ Overview & Events`), organizers specify the number of `Clues Per Team` and click **`🎲 Generate Clue Assignments`**.
   - The server executes `generateRandomClueAssignments(eventId)`.
   - Each team receives a personalized, randomized sequence of clues (`TeamClueAssignment` records) stored in the database.
   - **Fixed Starting Clue (Optional):** If the event configuration defines a fixed starting clue, that clue is set as Step 1 for every team, while subsequent steps are randomized.
2. **First Clue Discovery on Player Dashboard:**
   - Upon logging into `/dashboard`, the server fetches the team's current assignment via `/game/current-clue`.
   - Before scanning the first QR code, the clue riddle remains **sealed** for security.
   - The dashboard explicitly displays the designated **Checkpoint Name / Location** for Step 1 (e.g., *"Central Library Steps"*).
3. **Unlocking the First Clue:**
   - Team members navigate physically to the specified checkpoint on campus.
   - Scanning the physical QR code posted at that location unlocks the clue description and reveals the riddle on their dashboard.
4. **Submitting the Answer:**
   - The team decipher the riddle and submits their answer via the dashboard form.
   - A correct answer awards points, marks Level 1 complete, and advances the Log Pose to Step 2's assigned checkpoint location.

---

## 🧭 4. PLAYER DASHBOARD & GAMEPLAY FLOW

1. **Player Registration & Login (`/register`, `/login`):**
   - Teams select an active event and register with leader details and password.
2. **Player Dashboard (`/dashboard`):**
   - Displays Team Name, Team ID, Total Points, Current Level, Wrong Scans, Timer, and Collected Secret Code Fragments.
   - **Clue Challenge Card:** Displays assigned checkpoint location. Once QR is scanned, the clue description and answer submission form appear.
   - **Secret Code Fragments & Physical Chest Form:** Shows collected fragment badges and a submission input to unlock the final physical treasure chest.
   - **Side Quests Section:** Solve extra riddles to earn points and code fragments.
   - **Score History Table:** Displays personal score transaction history (`+Points`, `-Penalties`).
3. **Level Map (`/map`):**
   - Visual voyage map showing completed islands and current location. Unreached future islands are blurred and locked.
4. **Leaderboard (`/leaderboard`):**
   - Displays real-time team point rankings. Clicking a team opens a detail inspector modal for admins or current team members.

---

## ⚙️ 4. QUICK COMMANDS

- **Install dependencies:** `npm run install:all`
- **Seed sample event data:** `npm run seed`
- **Run development server:** `npm run dev`
- **Run integration test suite:** `npm test`
