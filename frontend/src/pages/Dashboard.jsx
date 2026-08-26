import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

function fmtMs(ms) {
  if (ms == null || ms <= 0) return "—";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

const TX_LABELS = {
  CORRECT_QR: { label: "QR Code Found", color: "ok" },
  CLUE_COMPLETED: { label: "Clue Solved", color: "ok" },
  SPEED_BONUS: { label: "Speed Bonus", color: "info" },
  WRONG_QR: { label: "Wrong QR", color: "danger" },
  WRONG_ANSWER: { label: "Wrong Answer", color: "danger" },
  HINT_PENALTY: { label: "Hint Used", color: "warn" },
  BONUS: { label: "Bonus QR", color: "info" },
  FINAL_CHALLENGE: { label: "Final Treasure", color: "ok" },
  ADMIN_ADJUSTMENT: { label: "Admin Adjustment", color: "info" },
  TRAP: { label: "Wrong QR", color: "danger" },
  CHECKPOINT: { label: "Checkpoint", color: "info" },
  ROAD_PONEGLYPH: { label: "Special QR", color: "ok" },
};

export default function Dashboard() {
  const { team, token, logout } = useAuth();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [clue, setClue] = useState(null);
  const [history, setHistory] = useState([]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [meData, clueData, histData] = await Promise.all([
      api.get("/teams/me", { token }),
      api.get("/game/current-clue", { token }),
      api.get("/game/score-history", { token }),
    ]);
    setMe(meData);
    setClue(clueData);
    setHistory(histData.history || []);
  }, [token]);

  useEffect(() => {
    load().catch((err) => {
      if (err.status === 401) {
        logout();
        navigate("/login", { replace: true });
      } else setError(err.message);
    });
  }, [load, logout, navigate]);

  const submitAnswer = async (e) => {
    e.preventDefault();
    if (!clue?.clue) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await api.post("/game/answer", { clueId: clue.clue.id, answer }, { token });
      if (res.missionComplete) {
        setNotice(`🏴‍☠️ YOU FOUND THE TREASURE! Final Points: ${res.totalPoints}`);
      } else if (res.levelCompleted) {
        setNotice(
          `🏝️ LEVEL COMPLETE! Level ${res.levelCompleted} Complete! +${res.pointsEarned} points` +
          (res.speedBonus ? ` (incl. ${res.speedBonus} speed bonus)` : "") +
          ` → New destination: Level ${res.newLevel}`
        );
      } else {
        setNotice(res.message);
      }
      setAnswer("");
      await load();
    } catch (err) {
      setError(err.message);
      if (err.code === "MAX_ATTEMPTS") await load();
    } finally {
      setBusy(false);
    }
  };

  const useHint = async (hintNumber) => {
    if (!clue?.clue) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await api.post("/game/hint", { clueId: clue.clue.id, hintNumber }, { token });
      setNotice(`${res.hint} (-${res.penalty} points)`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const teamData = me?.team || team;
  const isComplete = teamData?.status === "completed";
  const unlocked = !!clue?.unlocked;
  const currentLevel = teamData?.currentLevel || teamData?.currentClue || 1;
  const totalLevels = me?.totalLevels || me?.totalClues || "?";
  const rank = me?.rank || "?";

  return (
    <div>
      <div className="topbar">
        <span className="brand">
          <Link to="/" style={{ color: "inherit" }}>
            🏴‍☠️ THE LOST TREASURE
          </Link>
        </span>
        <div className="links">
          <Link to="/scan">Scan QR Code</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          <Link to="/map">Level Map</Link>
          <Link to="/bounty-history">Score History</Link>
          <button className="btn small ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="container">
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}

        <div className="spread" style={{ marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>🏴‍☠️ {teamData?.teamName}</h2>
            <span className="muted mono">{teamData?.teamId}</span>
          </div>
          <div className="stat-grid" style={{ width: "100%", marginTop: 12 }}>
            <div className="stat">
              <div className="num" style={{ color: "#f5a623" }}>{teamData?.points ?? 0}</div>
              <div className="lbl">💰 Points</div>
            </div>
            <div className="stat">
              <div className="num">{currentLevel}</div>
              <div className="lbl">🌊 Current Level</div>
            </div>
            <div className="stat">
              <div className="num">
                {isComplete ? "✓" : `${teamData?.solvedClues?.length ?? 0} / ${totalLevels}`}
              </div>
              <div className="lbl">🗿 Clues Completed</div>
            </div>
            <div className="stat">
              <div className="num">#{rank}</div>
              <div className="lbl">🏆 Points Earned</div>
            </div>
            <div className="stat">
              <div className="num">{teamData?.wrongScans ?? 0}</div>
              <div className="lbl">⚓ Wrong QR Scans</div>
            </div>
            <div className="stat">
              <div className="num">{teamData?.hintsUsed?.length ?? 0}</div>
              <div className="lbl">💡 Hints Used</div>
            </div>
            <div className="stat">
              <div className="num">{fmtMs(me?.event?.remainingMs)}</div>
              <div className="lbl">🧭 Timer</div>
            </div>
          </div>
        </div>

        {isComplete ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48 }}>🏴‍☠️</div>
            <h2>TREASURE FOUND!</h2>
            <p className="muted">
              Final Points: <strong className="mono">{teamData.finalScore}</strong>
            </p>
            <Link to="/leaderboard" className="btn">
              View Leaderboard
            </Link>
          </div>
        ) : clue && clue.clue ? (
          <div className="card">
            <div className="spread">
              <span className="pill info">Level {clue.currentLevel || clue.clueNumber} · Clue {clue.clueNumber} of {totalLevels}</span>
              {unlocked ? (
                <span className="pill ok">Deciphered — answer it</span>
              ) : clue.locked ? (
                <span className="pill danger">🔒 Sealed</span>
              ) : (
                <span className="pill warn">Scan the QR Code to unlock</span>
              )}
            </div>
            <h2 style={{ marginBottom: 4 }}>{clue.clue.title}</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              <span className="mono">{clue.clue.checkpointName}</span> · {clue.clue.points} points ·{" "}
              {clue.clue.difficulty}
            </p>
            <p>{clue.clue.description}</p>

            {unlocked ? (
              <>
                <form className="row" onSubmit={submitAnswer} style={{ marginTop: 8 }}>
                  <input
                    style={{ flex: 1, minWidth: 200 }}
                    placeholder="Decipher the clue message..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    required
                  />
                  <button className="btn" type="submit" disabled={busy}>
                    Submit
                  </button>
                </form>

                {(clue.clue.hints || []).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p className="muted" style={{ marginBottom: 8 }}>
                      Stuck? Use a hint (costs points):
                    </p>
                    <div className="row">
                      {clue.clue.hints.map((h, i) => (
                        <button key={i} className="btn secondary small" onClick={() => useHint(i + 1)} disabled={busy}>
                          Hint {i + 1} (−{h.penalty} points)
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="muted">
                Find the QR Code posted at <strong>{clue.clue.checkpointName}</strong> and scan it to unlock this clue.
              </p>
            )}
          </div>
        ) : (
          <div className="card muted">No active levels right now. Set sail when the hunt begins.</div>
        )}

        <div className="card">
          <h3>Score History</h3>
          {history.length === 0 ? (
            <p className="muted">No score transactions yet, pirate.</p>
          ) : (
            <table className="board">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Action</th>
                  <th>Points</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 30).map((h, i) => {
                  const info = TX_LABELS[h.kind] || { label: h.kind, color: "info" };
                  return (
                    <tr key={i}>
                      <td className="muted mono">{h.level || "—"}</td>
                      <td>
                        <span className={`pill ${info.color}`}>{info.label}</span>
                      </td>
                      <td className="mono" style={{ color: h.points >= 0 ? "#f5a623" : "var(--danger)" }}>
                        {h.points > 0 ? `+${h.points}` : h.points}
                      </td>
                      <td className="muted" style={{ fontSize: 12 }}>{fmtDate(h.at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
