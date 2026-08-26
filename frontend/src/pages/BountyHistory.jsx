import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

const TX_LABELS = {
  CORRECT_QR: { label: "QR Code Found", icon: "📱", color: "ok" },
  CLUE_COMPLETED: { label: "Clue Solved", icon: "📜", color: "ok" },
  SPEED_BONUS: { label: "Speed Bonus", icon: "⚡", color: "info" },
  WRONG_QR: { label: "Wrong QR", icon: "❌", color: "danger" },
  WRONG_ANSWER: { label: "Wrong Answer", icon: "❌", color: "danger" },
  HINT_PENALTY: { label: "Hint Used", icon: "💡", color: "warn" },
  BONUS: { label: "Bonus QR", icon: "🎁", color: "info" },
  FINAL_CHALLENGE: { label: "Final Treasure", icon: "🏴‍☠️", color: "ok" },
  ADMIN_ADJUSTMENT: { label: "Admin Adjustment", icon: "⚙️", color: "info" },
  TRAP: { label: "Wrong QR", icon: "❌", color: "danger" },
  CHECKPOINT: { label: "Checkpoint", icon: "📍", color: "info" },
  ROAD_PONEGLYPH: { label: "Special QR", icon: "🗺️", color: "gold" },
};

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

export default function BountyHistory() {
  const { token } = useAuth();
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .get("/game/score-history", { token })
      .then((data) => setHistory(data.history || []))
      .catch(() => setError("Could not load score history."));
  }, [token]);

  const groupedByLevel = {};
  for (const tx of history) {
    const level = tx.level || 0;
    if (!groupedByLevel[level]) groupedByLevel[level] = [];
    groupedByLevel[level].push(tx);
  }

  const sortedLevels = Object.keys(groupedByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  const totalPoints = history.reduce((sum, tx) => sum + (tx.points || 0), 0);
  const positivePoints = history.filter((tx) => tx.points > 0).reduce((sum, tx) => sum + tx.points, 0);

  return (
    <div>
      <div className="topbar">
        <span className="brand">
          <Link to="/" style={{ color: "inherit" }}>
            🏴‍☠️ THE LOST TREASURE
          </Link>
        </span>
        <div className="links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/scan">Scan QR</Link>
          <Link to="/map">Level Map</Link>
          <Link to="/leaderboard">Leaderboard</Link>
        </div>
      </div>

      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📜</div>
          <h1 style={{ fontFamily: "var(--font-display)", color: "var(--gold)", margin: 0 }}>
            SCORE HISTORY
          </h1>
          <p className="muted" style={{ fontFamily: "var(--font-parchment)", fontStyle: "italic", fontSize: 16 }}>
            Your complete record of points earned and lost
          </p>
        </div>

        {/* Summary */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat">
            <div className="num" style={{ color: "var(--gold)" }}>
              {totalPoints}
            </div>
            <div className="lbl">💰 Net Points</div>
          </div>
          <div className="stat">
            <div className="num" style={{ color: "var(--ok)" }}>
              +{positivePoints}
            </div>
            <div className="lbl">📈 Points Earned</div>
          </div>
          <div className="stat">
            <div className="num">{history.length}</div>
            <div className="lbl">📋 Transactions</div>
          </div>
          <div className="stat">
            <div className="num">{sortedLevels.length}</div>
            <div className="lbl">🗺️ Levels Explored</div>
          </div>
        </div>

        {error && <div className="alert error">{error}</div>}

        {history.length === 0 ? (
          <div className="card muted" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🗺️</div>
            <h3>No score history yet</h3>
            <p>Start your hunt to earn points!</p>
            <Link to="/dashboard" className="btn" style={{ marginTop: 12 }}>
              🏴‍☠️ Start Hunting
            </Link>
          </div>
        ) : (
          sortedLevels.map((level) => {
            const txs = groupedByLevel[level];
            const levelNet = txs.reduce((sum, tx) => sum + (tx.points || 0), 0);
            const isFinal = sortedLevels[sortedLevels.length - 1] === level && level > 0;
            const levelName = level === 0 ? "Unassigned" : isFinal ? `Level ${level} — Final Treasure` : `Level ${level}`;
            const levelIcon = isFinal ? "🏴‍☠️" : "🏝️";

            return (
              <div key={level} className="card" style={{ marginBottom: 16 }}>
                <div className="spread" style={{ marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", color: "var(--gold)" }}>
                    {levelIcon} {levelName}
                  </h3>
                  <span className={`pill ${levelNet >= 0 ? "ok" : "danger"}`}>
                    {levelNet >= 0 ? "+" : ""}{levelNet} pts
                  </span>
                </div>

                <table className="board">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Points</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((tx, i) => {
                      const info = TX_LABELS[tx.kind] || { label: tx.kind, icon: "❓", color: "info" };
                      return (
                        <tr key={i}>
                          <td>
                            <span style={{ marginRight: 8 }}>{info.icon}</span>
                            <span className={`pill ${info.color}`}>{info.label}</span>
                          </td>
                          <td
                            className="mono"
                            style={{
                              color: tx.points >= 0 ? "var(--gold)" : "var(--danger)",
                              fontWeight: 700,
                            }}
                          >
                            {tx.points > 0 ? `+${tx.points}` : tx.points}
                          </td>
                          <td className="muted" style={{ fontSize: 12 }}>
                            {fmtDate(tx.at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })
        )}

        <p className="muted" style={{ textAlign: "center", marginTop: 24, fontFamily: "var(--font-heading)" }}>
          <Link to="/dashboard">← Back to Dashboard</Link>
        </p>
      </div>
    </div>
  );
}
