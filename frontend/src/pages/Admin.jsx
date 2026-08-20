import { useEffect, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, readAdmin, clearAdmin } from "../api.js";

const STATUS_LABEL = { NOT_STARTED: "Not started", ACTIVE: "Live", PAUSED: "Paused", ENDED: "Ended" };

export default function Admin() {
  const [admin] = useState(() => readAdmin());
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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

  return (
    <div>
      <div className="topbar">
        <span className="brand">
          <Link to="/" style={{ color: "inherit" }}>
            🏴‍☠️ CAMPUS 404
          </Link>{" "}
          <span className="muted" style={{ fontWeight: 400, fontFamily: "var(--font-heading)" }}>
            / Marine Headquarters
          </span>
        </span>
        <div className="links">
          <span className="muted">{admin.admin?.name}</span>
          <button
            className="btn small ghost"
            onClick={() => {
              clearAdmin();
              window.location.href = "/admin/login";
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1000 }}>
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}

        <div className="tabs">
          {[
            ["overview", "⚓ HQ Overview"],
            ["teams", "🏴‍☠️ Crews"],
            ["clues", "📜 Poneglyphs"],
            ["qrs", "🗺️ Road Map"],
            ["audit", "📋 War Log"],
          ].map(([key, label]) => (
            <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && <Overview token={token} run={run} flash={flash} />}
        {tab === "teams" && <Teams token={token} run={run} flash={flash} />}
        {tab === "clues" && <Clues token={token} run={run} flash={flash} />}
        {tab === "qrs" && <QRCodes token={token} run={run} flash={flash} />}
        {tab === "audit" && <Audit token={token} run={run} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Overview({ token, run, flash }) {
  const [stats, setStats] = useState(null);
  const [event, setEvent] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState(null);

  const load = useCallback(async () => {
    const data = await run(() => api.get("/admin/statistics", { token }));
    setStats(data.stats);
    setEvent(data.event);
    setSettingsDraft(null);
  }, [token]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const setStatus = async (status) => {
    await run(() => api.put("/admin/event/status", { status }, { token }));
    flash(`Event ${STATUS_LABEL[status] || status}`);
    load().catch(() => {});
  };

  const resetEvent = async () => {
    if (!window.confirm("Reset ALL crew progress, scores, scans and logs? This cannot be undone.")) return;
    await run(() => api.post("/admin/event/reset", {}, { token }));
    flash("Event reset — all crews sent back to the East Blue.");
    load().catch(() => {});
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    const patch = { ...settingsDraft };
    for (const k of ["duration", "maxTeamSize", "maxAttemptsPerClue", "wrongScanPenalty", "maxWrongScans",
      "wrongAnswerPenalty", "hint1Penalty", "hint2Penalty", "pointsPerScan",
      "correctQRPoints", "clueCompletionPoints", "speedBonusMax",
      "speedBonusT1", "speedBonusP1", "speedBonusT2", "speedBonusP2",
      "speedBonusT3", "speedBonusP3", "finalChallengePoints"]) {
      if (patch[k] !== undefined) patch[k] = Number(patch[k]);
    }
    await run(() => api.put("/admin/event/settings", patch, { token }));
    flash("Voyage settings saved.");
    load().catch(() => {});
  };

  const T = ({ label, state, set, type = "text" }) => (
    <div className="field" style={{ gridColumn: "span 1" }}>
      <label>{label}</label>
      <input type={type} value={state ?? ""} onChange={(e) => set(e.target.value)} />
    </div>
  );
  const B = ({ label, state, set }) => (
    <label className="row" style={{ marginBottom: 10 }}>
      <input type="checkbox" checked={!!state} onChange={(e) => set(e.target.checked)} />
      <span>{label}</span>
    </label>
  );

  const effectiveStatus = event?.effectiveStatus || event?.status || "NOT_STARTED";

  return (
    <>
      <div className="card">
        <div className="spread">
          <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", color: "var(--gold)" }}>
            ⚓ Voyage Control
          </h3>
          <span className={`pill ${effectiveStatus === "ACTIVE" ? "ok" : effectiveStatus === "ENDED" ? "danger" : "warn"}`}>
            {STATUS_LABEL[effectiveStatus] || "—"}
          </span>
        </div>
        <p className="muted" style={{ marginBottom: 8 }}>
          {event?.name} · {event?.duration} min · remaining {Math.round((event?.remainingMs || 0) / 1000)}s
        </p>
        <div className="row">
          <button className="btn" onClick={() => setStatus("ACTIVE")}>
            ⚓ {effectiveStatus === "ENDED" ? "Restart Voyage" : effectiveStatus === "NOT_STARTED" ? "Start Voyage" : "Resume Voyage"}
          </button>
          {effectiveStatus === "ACTIVE" && (
            <button className="btn secondary" onClick={() => setStatus("PAUSED")}>
              ⏸ Anchor (Pause)
            </button>
          )}
          {effectiveStatus === "ACTIVE" && (
            <button className="btn danger" onClick={() => setStatus("ENDED")}>
              🏴‍☠️ End Voyage
            </button>
          )}
          <button className="btn ghost danger" onClick={resetEvent}>
            💀 Reset All Progress
          </button>
        </div>
      </div>

      {stats && (
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)" }}>📊 Fleet Intel</h3>
          <div className="stat-grid">
            {[
              ["🏴‍☠️ Crews", stats.totalTeams],
              ["⚓ Active", stats.activeTeams],
              ["✅ Completed", stats.completedTeams],
              ["💀 Disabled", stats.disabledTeams],
              ["🗿 Poneglyph Scans", stats.totalQRScans],
              ["✅ Correct", stats.correctScans],
              ["⚓ Traps", stats.wrongScans],
              ["📜 Submissions", stats.totalSubmissions],
              ["🗺️ Clues", stats.totalClues],
              ["💰 Total Bounty", stats.totalPointsAwarded],
              ["📊 Avg Bounty", stats.averageScore],
            ].map(([lbl, num]) => (
              <div className="stat" key={lbl}>
                <div className="num">{num}</div>
                <div className="lbl">{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)" }}>⚙️ Voyage Settings</h3>
        {event && !settingsDraft && (
          <button className="btn secondary small" onClick={() => setSettingsDraft(event.settings || {})}>
            Edit Settings
          </button>
        )}
        {settingsDraft && (
          <form onSubmit={saveSettings}>
            <h4 style={{ marginTop: 0, fontFamily: "var(--font-heading)" }}>General</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <T label="Event Name" state={settingsDraft.name} set={(v) => setSettingsDraft({ ...settingsDraft, name: v })} />
              <T label="Duration (minutes)" type="number" state={settingsDraft.duration} set={(v) => setSettingsDraft({ ...settingsDraft, duration: v })} />
              <T label="Max Crew Size" type="number" state={settingsDraft.maxTeamSize} set={(v) => setSettingsDraft({ ...settingsDraft, maxTeamSize: v })} />
              <T label="Max Attempts / Clue" type="number" state={settingsDraft.maxAttemptsPerClue} set={(v) => setSettingsDraft({ ...settingsDraft, maxAttemptsPerClue: v })} />
            </div>

            <h4 style={{ fontFamily: "var(--font-heading)" }}>💰 Bounty System</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <T label="Correct Poneglyph Bounty" type="number" state={settingsDraft.correctQRPoints} set={(v) => setSettingsDraft({ ...settingsDraft, correctQRPoints: v })} />
              <T label="Clue Completion Bonus" type="number" state={settingsDraft.clueCompletionPoints} set={(v) => setSettingsDraft({ ...settingsDraft, clueCompletionPoints: v })} />
              <T label="Marine Trap Penalty" type="number" state={settingsDraft.wrongScanPenalty} set={(v) => setSettingsDraft({ ...settingsDraft, wrongScanPenalty: v })} />
              <T label="Wrong Answer Penalty" type="number" state={settingsDraft.wrongAnswerPenalty} set={(v) => setSettingsDraft({ ...settingsDraft, wrongAnswerPenalty: v })} />
              <T label="Den Den Mushi Hint 1 Cost" type="number" state={settingsDraft.hint1Penalty} set={(v) => setSettingsDraft({ ...settingsDraft, hint1Penalty: v })} />
              <T label="Den Den Mushi Hint 2 Cost" type="number" state={settingsDraft.hint2Penalty} set={(v) => setSettingsDraft({ ...settingsDraft, hint2Penalty: v })} />
              <T label="Laugh Tale Bounty" type="number" state={settingsDraft.finalChallengePoints} set={(v) => setSettingsDraft({ ...settingsDraft, finalChallengePoints: v })} />
            </div>

            <h4 style={{ fontFamily: "var(--font-heading)" }}>⚡ Speed Bonus</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <T label="Max Speed Bonus" type="number" state={settingsDraft.speedBonusMax} set={(v) => setSettingsDraft({ ...settingsDraft, speedBonusMax: v })} />
              <T label="Tier 1: within (sec)" type="number" state={settingsDraft.speedBonusT1} set={(v) => setSettingsDraft({ ...settingsDraft, speedBonusT1: v })} />
              <T label="Tier 1: bounty" type="number" state={settingsDraft.speedBonusP1} set={(v) => setSettingsDraft({ ...settingsDraft, speedBonusP1: v })} />
              <T label="Tier 2: within (sec)" type="number" state={settingsDraft.speedBonusT2} set={(v) => setSettingsDraft({ ...settingsDraft, speedBonusT2: v })} />
              <T label="Tier 2: bounty" type="number" state={settingsDraft.speedBonusP2} set={(v) => setSettingsDraft({ ...settingsDraft, speedBonusP2: v })} />
              <T label="Tier 3: within (sec)" type="number" state={settingsDraft.speedBonusT3} set={(v) => setSettingsDraft({ ...settingsDraft, speedBonusT3: v })} />
              <T label="Tier 3: bounty" type="number" state={settingsDraft.speedBonusP3} set={(v) => setSettingsDraft({ ...settingsDraft, speedBonusP3: v })} />
            </div>

            <h4 style={{ fontFamily: "var(--font-heading)" }}>🔧 Toggles</h4>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <B label="Marine Trap penalties" state={settingsDraft.wrongScanPenaltyEnabled} set={(v) => setSettingsDraft({ ...settingsDraft, wrongScanPenaltyEnabled: v })} />
              <B label="Wrong answer penalties" state={settingsDraft.wrongAnswerPenaltyEnabled} set={(v) => setSettingsDraft({ ...settingsDraft, wrongAnswerPenaltyEnabled: v })} />
              <B label="Speed bonus enabled" state={settingsDraft.speedBonusEnabled} set={(v) => setSettingsDraft({ ...settingsDraft, speedBonusEnabled: v })} />
              <B label="Lock after max traps" state={settingsDraft.lockAfterMaxWrongScans} set={(v) => setSettingsDraft({ ...settingsDraft, lockAfterMaxWrongScans: v })} />
              <B label="Allow negative bounty" state={settingsDraft.allowNegativeScore} set={(v) => setSettingsDraft({ ...settingsDraft, allowNegativeScore: v })} />
              <B label="Devil Fruit QRs" state={settingsDraft.bonusQREnabled} set={(v) => setSettingsDraft({ ...settingsDraft, bonusQREnabled: v })} />
              <B label="Marine Trap QRs" state={settingsDraft.trapQREnabled} set={(v) => setSettingsDraft({ ...settingsDraft, trapQREnabled: v })} />
              <B label="Den Den Mushi QRs" state={settingsDraft.hintQREnabled} set={(v) => setSettingsDraft({ ...settingsDraft, hintQREnabled: v })} />
              <B label="Checkpoint QRs" state={settingsDraft.checkpointQREnabled} set={(v) => setSettingsDraft({ ...settingsDraft, checkpointQREnabled: v })} />
              <B label="Bounty Board visible" state={settingsDraft.leaderboardVisible} set={(v) => setSettingsDraft({ ...settingsDraft, leaderboardVisible: v })} />
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn" type="submit">
                Save Settings
              </button>
              <button className="btn secondary" type="button" onClick={() => setSettingsDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Teams({ token, run, flash }) {
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState("");
  const [pointsMap, setPointsMap] = useState({});
  const [unlockMap, setUnlockMap] = useState({});

  const load = useCallback(async () => {
    const data = await run(() => api.get("/admin/teams", { token }));
    setTeams(data.teams || []);
  }, [token]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const refresh = () => load().catch(() => {});

  const filtered = teams.filter(
    (t) => !search || (t.teamName + t.teamId + (t.members || []).map((m) => m.fullName).join(" ")).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", color: "var(--gold)" }}>
          🏴‍☠️ Crews ({teams.length})
        </h3>
        <input
          style={{ maxWidth: 240 }}
          placeholder="Search name / ID / member..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && <p className="muted">No crews match.</p>}
      {filtered.map((t) => (
        <div key={t._id} className="card" style={{ background: "var(--bg-2)", padding: 14 }}>
          <div className="spread">
            <div>
              <strong>{t.teamName}</strong> <span className="muted mono">{t.teamId}</span>
              <div className="muted" style={{ fontSize: 13 }}>
                Bounty <b className="mono" style={{ color: "var(--gold)" }}>{t.points}</b> · Island {t.currentLevel || t.currentClue || 1} · Poneglyph {t.currentClue} ·{" "}
                {t.solvedClues?.length} decoded · {t.wrongScans} traps
              </div>
              <span className={`pill ${t.status === "active" ? "ok" : t.status === "completed" ? "info" : "danger"}`}>
                {t.status}
              </span>{" "}
              {t.lockedClue && <span className="pill warn">locked</span>}
            </div>
            <div className="row">
              <input
                style={{ width: 90 }}
                placeholder="delta"
                value={pointsMap[t._id] ?? ""}
                onChange={(e) => setPointsMap({ ...pointsMap, [t._id]: e.target.value })}
              />
              <button
                className="btn small"
                onClick={async () => {
                  await run(() => api.put(`/admin/teams/${t._id}/points`, { delta: Number(pointsMap[t._id] || 0) }, { token }));
                  flash("Bounty updated");
                  refresh();
                }}
              >
                Adjust
              </button>
              <input
                style={{ width: 70 }}
                placeholder="clue#"
                value={unlockMap[t._id] ?? ""}
                onChange={(e) => setUnlockMap({ ...unlockMap, [t._id]: e.target.value })}
              />
              <button
                className="btn small secondary"
                onClick={async () => {
                  await run(() => api.put(`/admin/teams/${t._id}/unlock-clue`, { clueNumber: Number(unlockMap[t._id]) || 1 }, { token }));
                  flash("Poneglyph unlocked");
                  refresh();
                }}
              >
                Unlock
              </button>
              <button
                className="btn small secondary"
                onClick={async () => {
                  await run(() => api.patch(`/admin/teams/${t._id}/status`, {}, { token }));
                  flash("Crew status toggled");
                  refresh();
                }}
              >
                {t.status === "disabled" ? "Enable" : "Disable"}
              </button>
              <button
                className="btn small danger"
                onClick={async () => {
                  if (!window.confirm(`Reset progress for ${t.teamName}?`)) return;
                  await run(() => api.post(`/admin/teams/${t._id}/reset`, {}, { token }));
                  flash("Crew reset — sent back to East Blue");
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

function Clues({ token, run, flash }) {
  const [clues, setClues] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    clueNumber: "",
    title: "",
    description: "",
    checkpointName: "",
    answerType: "TEXT",
    correctAnswer: "",
    acceptedAnswers: "",
    points: 10,
    maxAttempts: 3,
    isFinal: false,
    hints: "",
  });

  const load = useCallback(async () => {
    const data = await run(() => api.get("/admin/clues", { token }));
    setClues(data.clues || []);
  }, [token]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    await run(() =>
      api.post(
        "/admin/clues",
        {
          clueNumber: Number(form.clueNumber),
          title: form.title,
          description: form.description,
          checkpointName: form.checkpointName,
          answerType: form.answerType,
          correctAnswer: form.correctAnswer,
          acceptedAnswers: form.acceptedAnswers.split(",").map((a) => a.trim()).filter(Boolean),
          points: Number(form.points),
          maxAttempts: Number(form.maxAttempts),
          isFinal: form.isFinal,
          hints: form.hints
            .split("|")
            .map((h) => {
              const [text, penalty = "0"] = h.split("/");
              return { text: text.trim(), penalty: Number(penalty) };
            })
            .filter((h) => h.text),
        },
        { token }
      )
    );
    flash("Poneglyph message created");
    setShowForm(false);
    setForm({ ...form, clueNumber: "", title: "", description: "", checkpointName: "", correctAnswer: "" });
    load().catch(() => {});
  };

  const remove = async (clue) => {
    if (!window.confirm(`Delete Poneglyph #${clue.clueNumber} "${clue.title}"? Its Road Map entry will be removed too.`)) return;
    await run(() => api.del(`/admin/clues/${clue._id}`, { token }));
    flash("Poneglyph deleted");
    load().catch(() => {});
  };

  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", color: "var(--gold)" }}>
          📜 Poneglyphs ({clues.length})
        </h3>
        <button className="btn small" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close form" : "+ New Poneglyph"}
        </button>
      </div>

      {showForm && (
        <form className="card" style={{ background: "var(--bg-2)" }} onSubmit={create}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div className="field">
              <label>Poneglyph Number</label>
              <input type="number" value={form.clueNumber} onChange={set("clueNumber")} required />
            </div>
            <div className="field">
              <label>Bounty Reward</label>
              <input type="number" value={form.points} onChange={set("points")} required />
            </div>
          </div>
          <div className="field">
            <label>Title</label>
            <input value={form.title} onChange={set("title")} required />
          </div>
          <div className="field">
            <label>Island Checkpoint</label>
            <input value={form.checkpointName} onChange={set("checkpointName")} required />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={form.description} onChange={set("description")} rows={2} required />
          </div>
          <div className="field">
            <label>Correct Answer</label>
            <input value={form.correctAnswer} onChange={set("correctAnswer")} required />
          </div>
          <div className="field">
            <label>Accepted Alternatives (comma separated)</label>
            <input value={form.acceptedAnswers} onChange={set("acceptedAnswers")} placeholder="e.g. Library, The Library" />
          </div>
          <div className="field">
            <label>Hints — format: text/penalty, separated by | (e.g. Smells like paper/2 | Behind the statue/5)</label>
            <input value={form.hints} onChange={set("hints")} />
          </div>
          <div className="row">
            <div className="field">
              <label>Max Attempts</label>
              <input type="number" value={form.maxAttempts} onChange={set("maxAttempts")} style={{ width: 100 }} />
            </div>
            <label className="row" style={{ marginBottom: 14 }}>
              <input type="checkbox" checked={form.isFinal} onChange={(e) => setForm({ ...form, isFinal: e.target.checked })} />
              <span>🏴‍☠️ Final Poneglyph (Laugh Tale)</span>
            </label>
          </div>
          <button className="btn" type="submit">
            Create Poneglyph
          </button>
        </form>
      )}

      {clues.map((c) => (
        <div key={c._id} className="card" style={{ background: "var(--bg-2)", padding: 14 }}>
          <div className="spread">
            <div>
              <span className={`pill ${c.isFinal ? "danger" : "info"}`}>#{c.clueNumber}</span>{" "}
              <strong>{c.title}</strong>{" "}
              <span className="muted" style={{ fontSize: 13 }}>
                {c.checkpointName} · {c.points} bounty · {c.difficulty} · {c.maxAttempts} attempts
              </span>
              {!c.active && <span className="pill warn" style={{ marginLeft: 6 }}>inactive</span>}
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{c.description}</div>
            </div>
            <div className="row">
              <span className="muted mono" style={{ fontSize: 12 }}>
                ans: {c.correctAnswer}
              </span>
              <button className="btn small secondary" onClick={remove}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QRCodes({ token, run, flash }) {
  const [qrs, setQrs] = useState([]);
  const [clues, setClues] = useState([]);
  const [selectedClue, setSelectedClue] = useState("");
  const [frontendUrl, setFrontendUrl] = useState("");

  const load = useCallback(async () => {
    const [qrData, clueData] = await Promise.all([
      run(() => api.get("/admin/qrcodes", { token })),
      run(() => api.get("/admin/clues", { token })),
    ]);
    setQrs(qrData.qrcodes || []);
    setFrontendUrl(qrData.frontendUrl || "");
    setClues(clueData.clues || []);
  }, [token]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const generate = async () => {
    if (!selectedClue) return flash("Select a Poneglyph first");
    const res = await run(() => api.post("/admin/qrcodes/generate", { clueId: selectedClue }, { token }));
    flash(res.message || "Poneglyph QR generated");
    load().catch(() => {});
  };

  const toggle = async (qr) => {
    await run(() => api.patch(`/admin/qrcodes/${qr._id}/toggle`, {}, { token }));
    flash(`Poneglyph ${qr.qrId} ${qr.active ? "activated" : "deactivated"}`);
    load().catch(() => {});
  };

  const hasQR = new Set(
    (qrs || [])
      .filter((q) => q.type === "NORMAL" && q.clueId)
      .map((q) => (typeof q.clueId === "object" ? q.clueId._id : q.clueId))
  );

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 14 }}>
        <select value={selectedClue} onChange={(e) => setSelectedClue(e.target.value)} style={{ maxWidth: 260 }}>
          <option value="">— select Poneglyph —</option>
          {clues.map((c) => (
            <option key={c._id} value={c._id}>
              #{c.clueNumber} {c.title}
              {hasQR.has(c._id) ? " (exists)" : " (new)"}
            </option>
          ))}
        </select>
        <button className="btn small" onClick={generate}>
          Generate QR for Poneglyph
        </button>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: -8, marginBottom: 12 }}>
        Poneglyphs marked <span className="mono">(exists)</span> already have a QR code. Pick one marked <span className="mono">(new)</span> to create its QR.
      </p>

      {qrs.length === 0 && <p className="muted">No Poneglyph QR codes yet. Create Poneglyphs first, then generate QRs.</p>}
      <div className="alert" style={{ margin: "12px 0" }}>
        To generate QR images / a printable sheet, run from the backend directory:
        <code style={{ display: "block", marginTop: 6 }}>
          npm run generate:qrs {"&&"} npm run print:qrs
        </code>
        (creates <code>backend/qr-sheets.html</code> — open in browser and print).
      </div>
      {qrs.map((qr) => (
        <div key={qr._id} className="card" style={{ background: "var(--bg-2)", padding: 14 }}>
          <div className="spread">
            <div>
              <span className={`pill ${qr.active ? "ok" : "warn"}`}>{qr.active ? "active" : "inactive"}</span>{" "}
              <span className="mono" style={{ fontWeight: 700 }}>{qr.qrId}</span>{" "}
              <span className={`pill info`}>{qr.type}</span>{" "}
              {qr.level > 0 && <span className="pill info">Island {qr.level}</span>}{" "}
              {qr.clueId && (
                <span className="muted" style={{ fontSize: 13 }}>
                  #{qr.clueId.clueNumber} {qr.clueId.title}
                </span>
              )}
              {qr.checkpointName && <div className="muted" style={{ fontSize: 13 }}>{qr.checkpointName}</div>}
              <div className="muted mono" style={{ fontSize: 12, wordBreak: "break-all" }}>
                {frontendUrl}/scan/{qr.qrId}
              </div>
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

function Audit({ token, run }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    run(() => api.get("/admin/audit", { token }))
      .then((data) => setLogs(data.logs || []))
      .catch(() => {});
  }, [token]);

  return (
    <div className="card">
      <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)" }}>
        📋 War Log ({logs.length})
      </h3>
      {logs.length === 0 && <p className="muted">No entries in the war log yet.</p>}
      <ul className="list">
        {logs.map((l) => (
          <li key={l._id}>
            <span className="row" style={{ justifyContent: "space-between" }}>
              <span>
                <span className="pill info">{l.action}</span>{" "}
                <span className="muted mono" style={{ fontSize: 12 }}>
                  {l.targetType} {l.targetId}
                </span>
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                {l.adminName} · {new Date(l.createdAt).toLocaleString()}
              </span>
            </span>
            {l.note && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{l.note}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
