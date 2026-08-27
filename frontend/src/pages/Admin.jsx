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
        {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}
        {notice && <div className="alert success" style={{ marginBottom: 16 }}>{notice}</div>}

        {tab === "overview" && <Overview token={token} run={run} flash={flash} />}
        {tab === "teams" && <Teams token={token} run={run} flash={flash} />}
        {tab === "clues" && <Clues token={token} run={run} flash={flash} />}
        {tab === "qrs" && <QRCodes token={token} run={run} flash={flash} />}
        {tab === "sidequests" && <SideQuests token={token} run={run} flash={flash} />}
        {tab === "audit" && <Audit token={token} run={run} />}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Overview({ token, run, flash }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
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
  }, [token, selectedEventId]);

  useEffect(() => {
    loadEvents().catch(() => {});
  }, [loadEvents]);

  const loadEventDetails = useCallback(async () => {
    if (!selectedEventId) return;
    const [statData, eventData] = await Promise.all([
      run(() => api.get("/admin/statistics", { token })),
      run(() => api.get(`/events/${selectedEventId}`, { token })),
    ]);
    setStats(statData.stats);
    setEvent(eventData);
    setSettingsDraft(null);
  }, [token, selectedEventId]);

  useEffect(() => {
    loadEventDetails().catch(() => {});
  }, [loadEventDetails]);

  const setStatus = async (status) => {
    if (!selectedEventId) return;
    await run(() => api.post(`/events/${selectedEventId}/status`, { status }, { token }));
    flash(`Event status set to ${STATUS_LABEL[status] || status}`);
    loadEventDetails().catch(() => {});
  };

  const createNewEvent = async () => {
    const name = window.prompt("Enter new Event name:");
    if (!name) return;
    const res = await run(() => api.post("/events", { name, status: "DRAFT" }, { token }));
    flash(`Event "${res.name}" created!`);
    loadEvents().catch(() => {});
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
          <button className="btn small ok" onClick={createNewEvent}>
            + Create Event
          </button>
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
              <button className="btn small" onClick={() => setStatus("RUNNING")}>
                Start / Resume
              </button>
              <button className="btn small secondary" onClick={() => setStatus("PAUSED")}>
                Pause
              </button>
              <button className="btn small danger" onClick={() => setStatus("ENDED")}>
                End
              </button>
            </div>
          )}
        </div>
      </div>

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
            <h3 style={{ color: "var(--gold)" }}>⚙️ Event Rules & Theme Config</h3>
            {!settingsDraft && (
              <button className="btn secondary small" onClick={() => setSettingsDraft({ settings: event.settings || {}, theme: event.theme || {} })}>
                Edit Settings
              </button>
            )}
          </div>

          {settingsDraft && (
            <form onSubmit={saveSettings} style={{ marginTop: 16 }}>
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

function Teams({ token, run, flash }) {
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const data = await run(() => api.get("/teams", { token }));
    setTeams(data.teams || []);
  }, [token]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const filtered = teams.filter(
    (t) => !search || (t.teamName + t.teamId).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: "var(--gold)" }}>🏴‍☠️ Registered Teams ({teams.length})</h3>
        <input
          style={{ maxWidth: 240 }}
          placeholder="Search team..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.map((t) => (
        <div key={t._id} className="card" style={{ background: "var(--bg-2)", padding: 14, marginBottom: 8 }}>
          <div className="spread">
            <div>
              <strong>{t.teamName}</strong> <span className="muted mono">{t.teamId}</span>
              <div className="muted" style={{ fontSize: 13 }}>
                Points: <b style={{ color: "var(--gold)" }}>{t.points}</b> · Status: {t.status}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Clues({ token, run, flash }) {
  const [clues, setClues] = useState([]);

  const load = useCallback(async () => {
    const data = await run(() => api.get("/admin/clues", { token }));
    setClues(data.clues || []);
  }, [token]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <div className="card">
      <h3 style={{ color: "var(--gold)" }}>📜 Clue Pool ({clues.length})</h3>
      {clues.map((c) => (
        <div key={c._id} className="card" style={{ background: "var(--bg-2)", padding: 12, marginBottom: 8 }}>
          <strong>#{c.clueNumber} {c.title}</strong> — {c.points} pts ({c.checkpointName})
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QRCodes({ token, run }) {
  const [qrs, setQrs] = useState([]);

  useEffect(() => {
    run(() => api.get("/admin/qrcodes", { token }))
      .then((data) => setQrs(data.qrcodes || []))
      .catch(() => {});
  }, [token]);

  return (
    <div className="card">
      <h3 style={{ color: "var(--gold)" }}>🗺️ Active Event QR Codes ({qrs.length})</h3>
      {qrs.map((qr) => (
        <div key={qr._id} className="card" style={{ background: "var(--bg-2)", padding: 12, marginBottom: 8 }}>
          <span className="mono" style={{ fontWeight: 700 }}>{qr.qrId}</span> — Type: {qr.type}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SideQuests({ token, run }) {
  return (
    <div className="card">
      <h3 style={{ color: "var(--gold)" }}>🎯 Event Side Quests</h3>
      <p className="muted">Manage optional side quests and secret code fragment rewards.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Audit({ token, run }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    run(() => api.get("/admin/audit", { token }))
      .then((data) => setLogs(data.logs || []))
      .catch(() => {});
  }, [token]);

  return (
    <div className="card">
      <h3 style={{ color: "var(--gold)" }}>📋 Activity Log ({logs.length})</h3>
      <ul className="list">
        {logs.map((l) => (
          <li key={l._id}>
            <span className="pill info">{l.action}</span> {l.note}
          </li>
        ))}
      </ul>
    </div>
  );
}
