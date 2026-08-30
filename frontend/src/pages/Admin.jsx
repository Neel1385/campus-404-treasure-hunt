import { useEffect, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, readAdmin, clearAdmin } from "../api.js";

const STATUS_LABEL = {
  DRAFT: "Draft",
  READY: "Ready",
  NOT_STARTED: "Not started",
  RUNNING: "Live",
  ACTIVE: "Live",
  PAUSED: "Paused",
  ENDED: "Ended",
  ARCHIVED: "Archived",
};

export default function Admin() {
  const [admin] = useState(() => readAdmin());
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState(() => localStorage.getItem("campus404_admin_event_id") || "");
  const [eventsList, setEventsList] = useState([]);

  useEffect(() => {
    if (selectedEventId) {
      localStorage.setItem("campus404_admin_event_id", selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (!admin?.token) return;
    api.get("/events", { token: admin.token })
      .then((data) => {
        const list = data || [];
        setEventsList(list);
        if (list.length > 0 && !selectedEventId) {
          const defaultId = list[0]._id;
          setSelectedEventId(defaultId);
          localStorage.setItem("campus404_admin_event_id", defaultId);
        }
      })
      .catch(() => {});
  }, [admin?.token]);

  if (!admin?.token) return <Navigate to="/admin/login" replace />;

  const token = admin.token;
  const run = async (fn) => {
    setError("");
    setNotice("");
    try {
      const res = await fn();
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const flash = (msg) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 4000);
  };

  const navItems = [
    ["overview", "⚓ Overview & Events"],
    ["teams", "🏴‍☠️ Teams Control"],
    ["clues", "📜 Clues & Pool"],
    ["qrs", "🗺️ QR Codes"],
    ["sidequests", "🎯 Side Quests"],
    ["audit", "📋 Activity Log"],
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-1, #0f172a)", color: "var(--text, #f8fafc)" }}>
      {/* Admin Sidebar Navigation Panel */}
      <aside
        style={{
          width: sidebarOpen ? "260px" : "70px",
          transition: "width 0.2s ease",
          background: "var(--bg-2, #1e293b)",
          borderRight: "1px solid var(--border, #334155)",
          display: "flex",
          flexDirection: "column",
          padding: "16px 12px",
          position: "sticky",
          top: 0,
          height: "100vh",
          boxSizing: "border-box",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          {sidebarOpen ? (
            <Link to="/" style={{ textDecoration: "none", color: "var(--gold, #f59e0b)", fontWeight: 700, fontSize: 16 }}>
              🏴‍☠️ CAMPUS 404
            </Link>
          ) : (
            <span style={{ fontSize: 20 }}>🏴‍☠️</span>
          )}
          <button
            className="btn small ghost"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ padding: "4px 8px", cursor: "pointer" }}
            title="Toggle Sidebar"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        {sidebarOpen && (
          <div style={{ fontSize: 12, color: "var(--muted, #94a3b8)", marginBottom: 16, paddingLeft: 4 }}>
            ADMIN CONTROL PANEL
          </div>
        )}

        <nav style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {navItems.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 6,
                border: "none",
                background: tab === key ? "var(--event-primary, #10b981)" : "transparent",
                color: tab === key ? "#fff" : "var(--text, #f8fafc)",
                fontWeight: tab === key ? 600 : 400,
                textAlign: "left",
                cursor: "pointer",
                fontSize: 14,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {sidebarOpen ? label : label.split(" ")[0]}
            </button>
          ))}
        </nav>

        <div style={{ borderTop: "1px solid var(--border, #334155)", paddingTop: 12, marginTop: 12 }}>
          {sidebarOpen && (
            <div style={{ fontSize: 13, color: "var(--muted, #94a3b8)", marginBottom: 8 }}>
              Logged in: <b>{admin.admin?.name || "Admin"}</b>
            </div>
          )}
          <button
            className="btn small danger"
            style={{ width: "100%", textAlign: "center" }}
            onClick={() => {
              clearAdmin();
              window.location.href = "/admin/login";
            }}
          >
            {sidebarOpen ? "Logout" : "🚪"}
          </button>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <main style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>
        {/* Persistent Global Event Bar */}
        <div className="card" style={{ marginBottom: 20, background: "var(--bg-2, #1e293b)", borderLeft: "4px solid var(--gold, #f59e0b)" }}>
          <div className="spread">
            <div className="row" style={{ gap: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--gold, #f59e0b)" }}>🎯 Active Event Context:</span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                style={{ minWidth: 260, padding: "6px 10px", borderRadius: 6, fontSize: 14, fontWeight: 600 }}
              >
                <option value="">-- Select Active Event --</option>
                {eventsList.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name} ({STATUS_LABEL[e.status] || e.status})
                  </option>
                ))}
              </select>
            </div>
            {selectedEventId && (
              <span className="pill info" style={{ fontSize: 12 }}>
                ID: {selectedEventId}
              </span>
            )}
          </div>
        </div>

        {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}
        {notice && <div className="alert success" style={{ marginBottom: 16 }}>{notice}</div>}

        {tab === "overview" && (
          <Overview
            token={token}
            run={run}
            flash={flash}
            selectedEventId={selectedEventId}
            setSelectedEventId={setSelectedEventId}
          />
        )}
        {tab === "teams" && <Teams token={token} run={run} flash={flash} eventId={selectedEventId} />}
        {tab === "clues" && <Clues token={token} run={run} flash={flash} eventId={selectedEventId} />}
        {tab === "qrs" && <QRCodes token={token} run={run} flash={flash} eventId={selectedEventId} />}
        {tab === "sidequests" && <SideQuests token={token} run={run} flash={flash} eventId={selectedEventId} />}
        {tab === "audit" && <Audit token={token} run={run} eventId={selectedEventId} />}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Overview({ token, run, flash, selectedEventId, setSelectedEventId }) {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [event, setEvent] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState(null);

  const loadEvents = useCallback(async () => {
    const data = await run(() => api.get("/events", { token }));
    const list = data || [];
    setEvents(list);
    if (list.length > 0 && !selectedEventId) {
      setSelectedEventId(list[0]._id);
    }
  }, [token, selectedEventId, setSelectedEventId]);

  useEffect(() => {
    loadEvents().catch(() => {});
  }, [loadEvents]);

  const loadEventDetails = useCallback(async () => {
    if (!selectedEventId) return;
    const [statData, eventData] = await Promise.all([
      run(() => api.get(`/admin/statistics?eventId=${selectedEventId}`, { token })),
      run(() => api.get(`/events/${selectedEventId}`, { token })),
    ]);
    setStats(statData.stats);
    setEvent(eventData);
    setSettingsDraft(null);
  }, [token, selectedEventId]);

  useEffect(() => {
    loadEventDetails().catch(() => {});
  }, [loadEventDetails]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [delTeams, setDelTeams] = useState(true);
  const [delClues, setDelClues] = useState(true);
  const [delQRs, setDelQRs] = useState(true);
  const [delLogs, setDelLogs] = useState(true);
  const [delQuests, setDelQuests] = useState(true);

  const setStatus = async (status) => {
    if (!selectedEventId) return;
    await run(() => api.post(`/events/${selectedEventId}/status`, { status }, { token }));
    flash(`Event status set to ${STATUS_LABEL[status] || status}`);
    loadEventDetails().catch(() => {});
  };

  const handleDeleteEvent = async () => {
    if (!selectedEventId) return;
    if (!window.confirm("Are you sure you want to permanently delete this event?")) return;
    await run(() => api.del(`/admin/events/${selectedEventId}`, {
      deleteTeams: delTeams,
      deleteClues: delClues,
      deleteQRs: delQRs,
      deleteLogs: delLogs,
      deleteSideQuests: delQuests,
    }, { token }));
    flash("Event permanently deleted.");
    setShowDeleteModal(false);
    setSelectedEventId("");
    localStorage.removeItem("campus404_admin_event_id");
    loadEvents().catch(() => {});
  };

  const createNewEvent = async () => {
    const name = window.prompt("Enter new Event name:");
    if (!name) return;
    const res = await run(() => api.post("/events", { name, status: "DRAFT" }, { token }));
    flash(`Event "${res.name}" created!`);
    loadEvents().catch(() => {});
  };

  const generateAssignments = async () => {
    if (!selectedEventId) return;
    const res = await run(() => api.post(`/events/${selectedEventId}/generate-assignments`, {}, { token }));
    flash(`Generated clue assignments for ${res.teamsProcessed || 0} team(s)!`);
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    if (!selectedEventId) return;
    await run(() => api.put(`/events/${selectedEventId}`, settingsDraft, { token }));
    flash("Event configuration saved.");
    loadEventDetails().catch(() => {});
  };

  const effectiveStatus = event?.effectiveStatus || event?.status || "DRAFT";

  return (
    <>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="spread">
          <div>
            <h3 style={{ margin: 0, color: "var(--gold)" }}>⚓ Event Selector & Lifecycle</h3>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Manage multiple independent campus hunt events from a single admin panel.
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn small secondary" onClick={generateAssignments}>
              🎲 Generate Clue Assignments
            </button>
            <button className="btn small ok" onClick={createNewEvent}>
              + Create Event
            </button>
          </div>
        </div>

        <div className="row" style={{ marginTop: 12, gap: 12 }}>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{ maxWidth: 320, padding: 8, borderRadius: 6 }}
          >
            {events.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name} ({STATUS_LABEL[e.status] || e.status})
              </option>
            ))}
          </select>

          {event && (
            <div className="row" style={{ gap: 8 }}>
              <span className={`pill ${effectiveStatus === "RUNNING" || effectiveStatus === "ACTIVE" ? "ok" : "warn"}`}>
                {STATUS_LABEL[effectiveStatus] || effectiveStatus}
              </span>
              <button className="btn small" onClick={() => setStatus("RUNNING")}>Start / Resume</button>
              <button className="btn small secondary" onClick={() => setStatus("PAUSED")}>Pause</button>
              <button className="btn small danger" onClick={() => setStatus("ENDED")}>End</button>
              <button className="btn small danger" style={{ background: "#8b0000" }} onClick={() => setShowDeleteModal(true)}>
                🗑️ Delete Event
              </button>
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div className="card" style={{ maxWidth: 440, width: "100%", background: "var(--bg-2)", border: "1px solid var(--danger)" }}>
            <h3 style={{ color: "var(--danger)", margin: "0 0 12px" }}>🗑️ Delete Event ({event?.name})</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              Select which associated event data should also be permanently purged:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <label className="row"><input type="checkbox" checked={delTeams} onChange={(e) => setDelTeams(e.target.checked)} /> <span>Registered Teams</span></label>
              <label className="row"><input type="checkbox" checked={delClues} onChange={(e) => setDelClues(e.target.checked)} /> <span>Clues Pool</span></label>
              <label className="row"><input type="checkbox" checked={delQRs} onChange={(e) => setDelQRs(e.target.checked)} /> <span>QR Codes</span></label>
              <label className="row"><input type="checkbox" checked={delLogs} onChange={(e) => setDelLogs(e.target.checked)} /> <span>Audit Logs & Submissions</span></label>
              <label className="row"><input type="checkbox" checked={delQuests} onChange={(e) => setDelQuests(e.target.checked)} /> <span>Side Quests</span></label>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn small danger" style={{ flex: 1 }} onClick={handleDeleteEvent}>Confirm Delete</button>
              <button className="btn small secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ color: "var(--gold)" }}>📊 Active Event Statistics</h3>
          <div className="stat-grid">
            {[
              ["🏴‍☠️ Teams", stats.totalTeams],
              ["⚓ Active", stats.activeTeams],
              ["✅ Completed", stats.completedTeams],
              ["🗿 QR Scans", stats.totalQRScans],
              ["📜 Submissions", stats.totalSubmissions],
              ["💰 Total Points", stats.totalPointsAwarded],
            ].map(([lbl, num]) => (
              <div className="stat" key={lbl}>
                <div className="num">{num}</div>
                <div className="lbl">{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {event && (
        <div className="card">
          <div className="spread">
            <h3 style={{ color: "var(--gold)" }}>⚙️ Event Rules & Config</h3>
            {!settingsDraft && (
              <button className="btn secondary small" onClick={() => setSettingsDraft({ settings: event.settings || {}, theme: event.theme || {} })}>
                Edit Settings
              </button>
            )}
          </div>

          {settingsDraft && (
            <form onSubmit={saveSettings} style={{ marginTop: 16 }}>
              <h4>📜 Event Rules & Regulations</h4>
              <div className="field">
                <textarea
                  rows={4}
                  value={settingsDraft.rulesAndRegulations ?? event.rulesAndRegulations ?? ""}
                  onChange={(e) => setSettingsDraft({
                    ...settingsDraft,
                    rulesAndRegulations: e.target.value
                  })}
                  placeholder="Enter event rules and guidelines for players..."
                />
              </div>

              <h4>🎨 Dynamic Event Website Theme</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div className="field">
                  <label>Primary Theme Color</label>
                  <input
                    type="color"
                    value={settingsDraft.theme?.primaryColor || "#10b981"}
                    onChange={(e) => setSettingsDraft({
                      ...settingsDraft,
                      theme: { ...settingsDraft.theme, primaryColor: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <label className="row">
                  <input
                    type="checkbox"
                    checked={settingsDraft.settings?.enableSecretCode !== false}
                    onChange={(e) => setSettingsDraft({
                      ...settingsDraft,
                      settings: { ...settingsDraft.settings, enableSecretCode: e.target.checked }
                    })}
                  />
                  <span>Enable Physical Secret Code Form for Players</span>
                </label>
                <div className="field">
                  <label>Accent Gold Color</label>
                  <input
                    type="color"
                    value={settingsDraft.theme?.accentColor || "#f59e0b"}
                    onChange={(e) => setSettingsDraft({
                      ...settingsDraft,
                      theme: { ...settingsDraft.theme, accentColor: e.target.value }
                    })}
                  />
                </div>
                <div className="field">
                  <label>Background Color</label>
                  <input
                    type="color"
                    value={settingsDraft.theme?.backgroundColor || "#0f172a"}
                    onChange={(e) => setSettingsDraft({
                      ...settingsDraft,
                      theme: { ...settingsDraft.theme, backgroundColor: e.target.value }
                    })}
                  />
                </div>
              </div>
              <h4>Wrong QR Blocking Engine</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label>Clues Per Team (Random Pool Limit)</label>
                  <input
                    type="number"
                    min="1"
                    value={settingsDraft.settings?.cluesPerTeam || 5}
                    onChange={(e) => setSettingsDraft({
                      ...settingsDraft,
                      settings: { ...settingsDraft.settings, cluesPerTeam: Number(e.target.value) }
                    })}
                  />
                </div>
                <div className="field">
                  <label>Physical Treasure Secret Code</label>
                  <input
                    type="text"
                    value={settingsDraft.settings?.finalSecretCode || "CAMPUS404"}
                    onChange={(e) => setSettingsDraft({
                      ...settingsDraft,
                      settings: { ...settingsDraft.settings, finalSecretCode: e.target.value }
                    })}
                  />
                </div>
              </div>

              <h4>Wrong QR Blocking Engine</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="row">
                  <input
                    type="checkbox"
                    checked={!!settingsDraft.settings?.wrongScanBlockingEnabled}
                    onChange={(e) => setSettingsDraft({
                      ...settingsDraft,
                      settings: { ...settingsDraft.settings, wrongScanBlockingEnabled: e.target.checked }
                    })}
                  />
                  <span>Enable Wrong-Scan Blocking Engine</span>
                </label>
                <div className="field">
                  <label>Strategy</label>
                  <select
                    value={settingsDraft.settings?.wrongScanBlockStrategy || "TIME"}
                    onChange={(e) => setSettingsDraft({
                      ...settingsDraft,
                      settings: { ...settingsDraft.settings, wrongScanBlockStrategy: e.target.value }
                    })}
                  >
                    <option value="TIME">Time Block (Minutes)</option>
                    <option value="SCAN_COUNT">Scan Count Block</option>
                    <option value="BOTH">Both (Time & Scan Count)</option>
                  </select>
                </div>
              </div>

              <div className="row" style={{ marginTop: 16 }}>
                <button className="btn" type="submit">Save Rules</button>
                <button className="btn secondary" type="button" onClick={() => setSettingsDraft(null)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function Teams({ token, run, flash, eventId }) {
  const [teams, setTeams] = useState([]);

  if (!eventId) {
    return (
      <div className="card alert warn">
        ⚠️ <strong>No Active Event Selected:</strong> Please select or create an event using the Event Context bar above to view and manage registered teams.
      </div>
    );
  }
  const [search, setSearch] = useState("");
  const [pointsMap, setPointsMap] = useState({});
  const [unlockMap, setUnlockMap] = useState({});
  const [passMap, setPassMap] = useState({});
  const [bulkCount, setBulkCount] = useState(5);
  const [generatedTeams, setGeneratedTeams] = useState(null);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamId, setNewTeamId] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleAddSingleTeam = async (e) => {
    e.preventDefault();
    await run(() => api.post(`/events/${eventId}/teams`, {
      teamName: newTeamName,
      teamId: newTeamId,
      password: newPassword,
    }, { token }));
    flash(`Team "${newTeamName}" registered!`);
    setShowAddTeam(false);
    setNewTeamName("");
    setNewTeamId("");
    setNewPassword("");
    load().catch(() => {});
  };

  const handleBulkGenerate = async () => {
    const res = await run(() => api.post(`/events/${eventId}/bulk-teams`, { count: Number(bulkCount) }, { token }));
    setGeneratedTeams(res.teams || res || []);
    flash(`Bulk generated ${res.teams?.length || count} teams!`);
    load().catch(() => {});
  };

  const load = useCallback(async () => {
    const query = eventId ? `?eventId=${eventId}` : "";
    const data = await run(() => api.get(`/admin/teams${query}`, { token }));
    setTeams(data.teams || []);
  }, [token, eventId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const refresh = () => load().catch(() => {});

  const filtered = teams.filter(
    (t) => !search || (t.teamName + t.teamId).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: "var(--gold)" }}>🏴‍☠️ Registered Teams ({teams.length})</h3>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn small ok" onClick={() => setShowAddTeam(!showAddTeam)}>
            {showAddTeam ? "Cancel" : "+ Add Single Team"}
          </button>
          <input
            type="number"
            min="1"
            max="50"
            value={bulkCount}
            onChange={(e) => setBulkCount(e.target.value)}
            style={{ width: 70 }}
          />
          <button className="btn small secondary" onClick={handleBulkGenerate}>
            ⚡ Bulk Generate Teams
          </button>
          <input
            style={{ maxWidth: 180 }}
            placeholder="Search team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {showAddTeam && (
        <form onSubmit={handleAddSingleTeam} style={{ background: "var(--bg-2)", padding: 12, borderRadius: 6, marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 12px", color: "var(--gold)" }}>+ Add Individual Team</h4>
          <div className="field"><label>Team Name</label><input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} required /></div>
          <div className="field"><label>Team ID (Unique)</label><input value={newTeamId} onChange={(e) => setNewTeamId(e.target.value)} placeholder="e.g. TEAM-DRAGON" required /></div>
          <div className="field"><label>Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
          <button className="btn small" type="submit" style={{ marginTop: 8 }}>Register Team</button>
        </form>
      )}

      {generatedTeams && (
        <div className="card" style={{ background: "var(--bg-2)", marginBottom: 16 }}>
          <div className="spread">
            <h4 style={{ margin: 0, color: "var(--gold)" }}>⚡ Generated Teams Output</h4>
            <button className="btn small ghost" onClick={() => setGeneratedTeams(null)}>Dismiss</button>
          </div>
          <table className="board" style={{ marginTop: 8 }}>
            <thead>
              <tr><th>Team ID</th><th>Team Name</th><th>Password</th></tr>
            </thead>
            <tbody>
              {generatedTeams.map((gt, idx) => (
                <tr key={idx}>
                  <td className="mono">{gt.teamId}</td>
                  <td>{gt.teamName}</td>
                  <td className="mono">{gt.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="card muted" style={{ textAlign: "center", padding: 20 }}>
          No teams registered for this event yet. Use Bulk Generate Teams above or share the registration link!
        </div>
      ) : filtered.map((t) => (
        <div key={t._id} className="card" style={{ background: "var(--bg-2)", padding: 14, marginBottom: 8 }}>
          <div className="spread">
            <div>
              <strong>{t.teamName}</strong> <span className="muted mono">{t.teamId}</span>
              <div className="muted" style={{ fontSize: 13 }}>
                Points: <b style={{ color: "var(--gold)" }}>{t.points}</b> · Status: {t.status} · Level {t.currentLevel || 1}
              </div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <input
                style={{ width: 80 }}
                placeholder="delta"
                value={pointsMap[t._id] ?? ""}
                onChange={(e) => setPointsMap({ ...pointsMap, [t._id]: e.target.value })}
              />
              <button
                className="btn small"
                onClick={async () => {
                  await run(() => api.put(`/admin/teams/${t._id}/points`, { delta: Number(pointsMap[t._id] || 0) }, { token }));
                  flash("Points adjusted");
                  refresh();
                }}
              >
                Adjust
              </button>
              <input
                style={{ width: 90 }}
                placeholder="new pass"
                value={passMap[t._id] ?? ""}
                onChange={(e) => setPassMap({ ...passMap, [t._id]: e.target.value })}
              />
              <button
                className="btn small ghost"
                onClick={async () => {
                  if (!passMap[t._id]) return flash("Enter a new password first");
                  await run(() => api.put(`/admin/teams/${t._id}/password`, { password: passMap[t._id] }, { token }));
                  flash(`Password changed for ${t.teamName}`);
                  setPassMap({ ...passMap, [t._id]: "" });
                  refresh();
                }}
              >
                Set Pass
              </button>
              <input
                style={{ width: 60 }}
                placeholder="clue#"
                value={unlockMap[t._id] ?? ""}
                onChange={(e) => setUnlockMap({ ...unlockMap, [t._id]: e.target.value })}
              />
              <button
                className="btn small secondary"
                onClick={async () => {
                  await run(() => api.put(`/admin/teams/${t._id}/unlock-clue`, { clueNumber: Number(unlockMap[t._id]) || 1 }, { token }));
                  flash("Clue unlocked");
                  refresh();
                }}
              >
                Unlock
              </button>
              <button
                className="btn small danger"
                onClick={async () => {
                  if (!window.confirm(`Reset progress for ${t.teamName}?`)) return;
                  await run(() => api.post(`/admin/teams/${t._id}/reset`, {}, { token }));
                  flash("Team reset");
                  refresh();
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Clues({ token, run, flash, eventId }) {
  const [clues, setClues] = useState([]);

  if (!eventId) {
    return (
      <div className="card alert warn">
        ⚠️ <strong>No Active Event Selected:</strong> Please select or create an event using the Event Context bar above to view and manage clues.
      </div>
    );
  }
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [form, setForm] = useState({
    clueNumber: "",
    title: "",
    description: "",
    checkpointName: "",
    correctAnswer: "",
    points: 10,
  });

  const load = useCallback(async () => {
    const query = eventId ? `?eventId=${eventId}` : "";
    const data = await run(() => api.get(`/admin/clues${query}`, { token }));
    setClues(data.clues || []);
  }, [token, eventId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    const query = eventId ? `?eventId=${eventId}` : "";
    await run(() =>
      api.post(
        `/admin/clues${query}`,
        {
          eventId,
          clueNumber: Number(form.clueNumber),
          title: form.title,
          description: form.description,
          checkpointName: form.checkpointName,
          correctAnswer: form.correctAnswer,
          points: Number(form.points),
        },
        { token }
      )
    );
    flash("Clue created");
    setShowForm(false);
    load().catch(() => {});
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this clue?")) return;
    await run(() => api.del(`/admin/clues/${id}`, { token }));
    flash("Clue deleted");
    load().catch(() => {});
  };

  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 12 }}>
        <h3 style={{ color: "var(--gold)", margin: 0 }}>📜 Clue Pool ({clues.length})</h3>
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn small secondary"
            onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8," +
                ["Clue Number,Title,Checkpoint,Points,Answer,Is Final"]
                  .concat(clues.map((c) => `${c.clueNumber},"${c.title}","${c.checkpointName || ""}",${c.points},"${c.correctAnswer || ""}",${c.isFinal}`))
                  .join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `event_${eventId}_clues.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            📥 Download All Clues
          </button>
          <button className="btn small secondary" onClick={() => setShowBulk(!showBulk)}>
            {showBulk ? "Cancel Bulk" : "⚡ Bulk Upload Clues"}
          </button>
          <button className="btn small" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ New Clue"}
          </button>
        </div>
      </div>

      {showBulk && (
        <div style={{ marginBottom: 16, background: "var(--bg-2)", padding: 12, borderRadius: 6 }}>
          <div className="spread">
            <h4 style={{ margin: 0 }}>⚡ Bulk Upload Clues (JSON or CSV/Excel)</h4>
            <div className="row" style={{ gap: 6 }}>
              <button
                type="button"
                className="btn small ghost"
                onClick={() => setBulkJson(JSON.stringify([
                  { clueNumber: 1, title: "Library Secret", description: "Look under desk 3", checkpointName: "Library", correctAnswer: "BOOK", points: 10 },
                  { clueNumber: 2, title: "Lab Cipher", description: "Read the periodic table", checkpointName: "Science Lab", correctAnswer: "NEON", points: 15 }
                ], null, 2))}
              >
                📄 Demo JSON
              </button>
              <button
                type="button"
                className="btn small ghost"
                onClick={() => setBulkJson("clueNumber,title,description,checkpointName,correctAnswer,points\n1,Library Secret,Look under desk 3,Library,BOOK,10\n2,Lab Cipher,Read the periodic table,Science Lab,NEON,15")}
              >
                📊 Demo CSV
              </button>
            </div>
          </div>

          <textarea
            rows={6}
            placeholder="Paste JSON array or CSV text here..."
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            style={{ width: "100%", fontFamily: "monospace", fontSize: 13, marginTop: 8 }}
          />
          <button
            className="btn small"
            style={{ marginTop: 8 }}
            onClick={async () => {
              try {
                let parsed = [];
                const trimmed = bulkJson.trim();
                if (trimmed.startsWith("[")) {
                  parsed = JSON.parse(trimmed);
                } else {
                  // CSV Parser
                  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
                  const headers = lines[0].split(",").map((h) => h.trim());
                  parsed = lines.slice(1).map((line) => {
                    const values = line.split(",").map((v) => v.trim());
                    const obj = {};
                    headers.forEach((h, idx) => {
                      let val = values[idx] || "";
                      if (h === "clueNumber" || h === "points") val = Number(val);
                      obj[h] = val;
                    });
                    return obj;
                  });
                }
                const res = await run(() => api.post(`/events/${eventId}/clues/bulk`, { clues: parsed }, { token }));
                flash(`Bulk uploaded ${res.inserted || res.length || "clues"} clues!`);
                setShowBulk(false);
                setBulkJson("");
                load().catch(() => {});
              } catch (err) {
                flash(`Parse / Upload Error: ${err.message}`);
              }
            }}
          >
            Submit Bulk Clues
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={create} style={{ marginBottom: 16, background: "var(--bg-2)", padding: 12, borderRadius: 6 }}>
          <div className="field"><label>Clue #</label><input type="number" value={form.clueNumber} onChange={(e) => setForm({ ...form, clueNumber: e.target.value })} required /></div>
          <div className="field"><label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="field"><label>Checkpoint Name</label><input value={form.checkpointName} onChange={(e) => setForm({ ...form, checkpointName: e.target.value })} required /></div>
          <div className="field"><label>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
          <div className="field"><label>Correct Answer</label><input value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} required /></div>
          <button className="btn small" type="submit" style={{ marginTop: 8 }}>Save Clue</button>
        </form>
      )}

      {clues.map((c) => (
        <div key={c._id} className="card" style={{ background: "var(--bg-2)", padding: 12, marginBottom: 8 }}>
          <div className="spread">
            <div>
              <strong>#{c.clueNumber} {c.title}</strong> — {c.points} pts ({c.checkpointName})
              {c.isFinal && <span className="pill ok" style={{ marginLeft: 8, fontSize: 11 }}>🏆 FINAL TREASURE CLUE</span>}
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button
                className={`btn small ${c.isFinal ? "ok" : "secondary"}`}
                onClick={async () => {
                  await run(() => api.put(`/admin/clues/${c._id}`, { isFinal: !c.isFinal }, { token }));
                  flash(c.isFinal ? "Unmarked as final clue" : "Marked as final clue!");
                  load().catch(() => {});
                }}
              >
                {c.isFinal ? "🏆 Final Clue" : "Make Final"}
              </button>
              <button className="btn small danger" onClick={() => remove(c._id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QRCodes({ token, run, flash, eventId }) {
  const [qrs, setQrs] = useState([]);

  if (!eventId) {
    return (
      <div className="card alert warn">
        ⚠️ <strong>No Active Event Selected:</strong> Please select or create an event using the Event Context bar above to view and manage QR codes.
      </div>
    );
  }
  const [clues, setClues] = useState([]);
  const [selectedClue, setSelectedClue] = useState("");

  const load = useCallback(async () => {
    const query = eventId ? `?eventId=${eventId}` : "";
    const [qrData, clueData] = await Promise.all([
      run(() => api.get(`/admin/qrcodes${query}`, { token })),
      run(() => api.get(`/admin/clues${query}`, { token })),
    ]);
    setQrs(qrData.qrcodes || []);
    setClues(clueData.clues || []);
  }, [token, eventId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const [logoUrl, setLogoUrl] = useState("");
  const [customText, setCustomText] = useState("");

  const generate = async () => {
    if (!selectedClue) return flash("Select a clue first");
    const query = eventId ? `?eventId=${eventId}` : "";
    await run(() => api.post(`/admin/qrcodes/generate${query}`, {
      clueId: selectedClue,
      eventId,
      branding: { logo: logoUrl, customText }
    }, { token }));
    flash("QR Code generated with custom branding");
    setLogoUrl("");
    setCustomText("");
    load().catch(() => {});
  };

  const toggle = async (qr) => {
    await run(() => api.patch(`/admin/qrcodes/${qr._id}/toggle`, {}, { token }));
    flash("QR active state toggled");
    load().catch(() => {});
  };

  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 12 }}>
          <h3 style={{ color: "var(--gold)", margin: 0 }}>🗺️ Event QR Codes ({qrs.length})</h3>
          <button
            className="btn small secondary"
            onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8," +
                ["QR ID,Type,Checkpoint,Scan Count,Active"]
                  .concat(qrs.map((q) => `${q.qrId},${q.type},${q.checkpointName || ""},${q.scanCount || 0},${q.active}`))
                  .join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `event_${eventId}_qrcodes.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            📥 Download All QR Codes
          </button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <select value={selectedClue} onChange={(e) => setSelectedClue(e.target.value)}>
            <option value="">— Select Clue —</option>
            {clues.map((c) => <option key={c._id} value={c._id}>#{c.clueNumber} {c.title}</option>)}
          </select>
          <input
            placeholder="Logo Image URL..."
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            style={{ width: 140 }}
          />
          <input
            placeholder="Overlay Description Text..."
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            style={{ width: 160 }}
          />
          <button className="btn small" onClick={generate}>Generate QR</button>
        </div>
      </div>

      {qrs.map((qr) => (
        <div key={qr._id} className="card" style={{ background: "var(--bg-2)", padding: 14, marginBottom: 8 }}>
          <div className="spread">
            <div>
              <span className="mono" style={{ fontWeight: 700, fontSize: 16, color: "var(--gold)" }}>{qr.qrId}</span>
              <span className="pill info" style={{ marginLeft: 8, fontSize: 11 }}>Type: {qr.type}</span>
              {qr.checkpointName && <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>({qr.checkpointName})</span>}
              {qr.branding?.customText && (
                <div style={{ fontSize: 12, color: "var(--gold-light)", marginTop: 4 }}>
                  🏷️ Label Text: "{qr.branding.customText}"
                </div>
              )}
              {qr.branding?.logo && (
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  🖼️ Logo URL: <span className="mono">{qr.branding.logo}</span>
                </div>
              )}
            </div>
            <button className="btn small secondary" onClick={() => toggle(qr)}>
              {qr.active ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SideQuests({ token, run, flash, eventId }) {
  const [quests, setQuests] = useState([]);

  if (!eventId) {
    return (
      <div className="card alert warn">
        ⚠️ <strong>No Active Event Selected:</strong> Please select or create an event using the Event Context bar above to view and manage side quests.
      </div>
    );
  }
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(25);
  const [answer, setAnswer] = useState("");
  const [secretCodeReward, setSecretCodeReward] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [bulkJson, setBulkJson] = useState("");

  const load = useCallback(async () => {
    if (!eventId) return;
    const qData = await run(() => api.get(`/events/${eventId}/side-quests`, { token }));
    setQuests(qData || []);
  }, [token, eventId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!eventId) return;

    await run(() => api.post(`/events/${eventId}/side-quests`, {
      eventId, title, description, points: Number(points), answer, secretCodeReward
    }, { token }));

    flash("Side quest created!");
    setTitle("");
    setDescription("");
    load().catch(() => {});
  };

  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 12 }}>
        <h3 style={{ color: "var(--gold)", margin: 0 }}>🎯 Event Side Quests ({quests.length})</h3>
        <button className="btn small secondary" onClick={() => setShowBulk(!showBulk)}>
          {showBulk ? "Cancel Bulk" : "⚡ Bulk Upload Side Quests"}
        </button>
      </div>

      {showBulk && (
        <div style={{ marginBottom: 16, background: "var(--bg-2)", padding: 12, borderRadius: 6 }}>
          <div className="spread">
            <h4 style={{ margin: 0 }}>⚡ Bulk Upload Side Quests (JSON or CSV/Excel)</h4>
            <div className="row" style={{ gap: 6 }}>
              <button
                type="button"
                className="btn small ghost"
                onClick={() => setBulkJson(JSON.stringify([
                  { title: "Library Riddle", description: "What has keys but no locks?", points: 25, answer: "piano", secretCodeReward: "X7" },
                  { title: "Math Challenge", description: "Solve 12 x 12", points: 20, answer: "144", secretCodeReward: "K9" }
                ], null, 2))}
              >
                📄 Demo JSON
              </button>
              <button
                type="button"
                className="btn small ghost"
                onClick={() => setBulkJson("title,description,points,answer,secretCodeReward\nLibrary Riddle,What has keys but no locks?,25,piano,X7\nMath Challenge,Solve 12 x 12,20,144,K9")}
              >
                📊 Demo CSV
              </button>
            </div>
          </div>

          <textarea
            rows={6}
            placeholder="Paste JSON array or CSV text here..."
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            style={{ width: "100%", fontFamily: "monospace", fontSize: 13, marginTop: 8 }}
          />
          <button
            className="btn small"
            style={{ marginTop: 8 }}
            onClick={async () => {
              try {
                let parsed = [];
                const trimmed = bulkJson.trim();
                if (trimmed.startsWith("[")) {
                  parsed = JSON.parse(trimmed);
                } else {
                  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
                  const headers = lines[0].split(",").map((h) => h.trim());
                  parsed = lines.slice(1).map((line) => {
                    const values = line.split(",").map((v) => v.trim());
                    const obj = {};
                    headers.forEach((h, idx) => {
                      let val = values[idx] || "";
                      if (h === "points") val = Number(val);
                      obj[h] = val;
                    });
                    return obj;
                  });
                }
                const res = await run(() => api.post(`/events/${eventId}/side-quests/bulk`, { quests: parsed }, { token }));
                flash(`Bulk uploaded ${res.inserted || res.length || "quests"} side quests!`);
                setShowBulk(false);
                setBulkJson("");
                load().catch(() => {});
              } catch (err) {
                flash(`Parse / Upload Error: ${err.message}`);
              }
            }}
          >
            Submit Bulk Side Quests
          </button>
        </div>
      )}

      <form onSubmit={create} style={{ background: "var(--bg-2)", padding: 12, borderRadius: 6, marginBottom: 16 }}>
        <div className="field"><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="field"><label>Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
        <div className="field"><label>Points</label><input type="number" value={points} onChange={(e) => setPoints(e.target.value)} required /></div>
        <div className="field"><label>Correct Answer</label><input value={answer} onChange={(e) => setAnswer(e.target.value)} required /></div>
        <div className="field"><label>Secret Code Fragment Reward</label><input value={secretCodeReward} onChange={(e) => setSecretCodeReward(e.target.value)} /></div>
        <button className="btn small" type="submit" style={{ marginTop: 8 }}>Create Side Quest</button>
      </form>

      {quests.map((q) => (
        <div key={q._id} className="card" style={{ background: "var(--bg-2)", padding: 12, marginBottom: 8 }}>
          <strong>{q.title}</strong> (+{q.points} pts) — Code Reward: <span className="mono">{q.secretCodeReward || "None"}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Audit({ token, run, eventId }) {
  const [logs, setLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");

  if (!eventId) {
    return (
      <div className="card alert warn">
        ⚠️ <strong>No Active Event Selected:</strong> Please select or create an event using the Event Context bar above to view activity logs.
      </div>
    );
  }

  const loadLogs = useCallback(() => {
    let query = eventId ? `?eventId=${eventId}` : "";
    if (actionFilter) query += `&action=${encodeURIComponent(actionFilter)}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    run(() => api.get(`/admin/audit${query}`, { token }))
      .then((data) => setLogs(data.logs || []))
      .catch(() => {});
  }, [token, eventId, actionFilter, search, run]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 12 }}>
        <h3 style={{ color: "var(--gold)", margin: 0 }}>📋 Activity Log ({logs.length})</h3>
        <div className="row" style={{ gap: 8 }}>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">All Action Types</option>
            <option value="POINTS_MANUAL">Points Manual</option>
            <option value="ADMIN_ADJUST_SCORE">Admin Adjust Score</option>
            <option value="CLUE_CREATED">Clue Created</option>
            <option value="CLUE_UPDATED">Clue Updated</option>
            <option value="CLUE_DELETED">Clue Deleted</option>
            <option value="CLUE_MANUAL_UNLOCK">Clue Unlocked</option>
            <option value="QR_CREATED">QR Created</option>
            <option value="QR_TOGGLED">QR Toggled</option>
            <option value="TEAM_STATUS_CHANGED">Team Status Changed</option>
            <option value="TEAM_RESET">Team Reset</option>
            <option value="BULK_TEAMS_GENERATED">Bulk Teams Generated</option>
            <option value="ADMIN_BLOCK_TEAM">Admin Block Team</option>
            <option value="ADMIN_UNBLOCK_TEAM">Admin Unblock Team</option>
          </select>
          <input
            placeholder="Search activity note/admin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 220 }}
          />
        </div>
      </div>

      <ul className="list">
        {logs.map((l) => (
          <li key={l._id}>
            <span className="pill info" style={{ fontSize: 11 }}>{l.action}</span>{" "}
            <strong>{l.adminName || "Admin"}</strong>: {l.note}
          </li>
        ))}
      </ul>
    </div>
  );
}
