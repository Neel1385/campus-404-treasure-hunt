import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

const TX_LABELS = {
  CORRECT_QR: { label: "Poneglyph Found", icon: "🗿", color: "ok" },
  CLUE_COMPLETED: { label: "Clue Decoded", icon: "📜", color: "ok" },
  SPEED_BONUS: { label: "Speed Bonus", icon: "⚡", color: "info" },
  WRONG_QR: { label: "Marine Trap", icon: "⚓", color: "danger" },
  WRONG_ANSWER: { label: "Wrong Answer", icon: "❌", color: "danger" },
  HINT_PENALTY: { label: "Den Den Mushi Hint", icon: "💡", color: "warn" },
  BONUS: { label: "Devil Fruit", icon: "🍎", color: "info" },
  FINAL_CHALLENGE: { label: "Laugh Tale", icon: "🏴‍☠️", color: "ok" },
  ADMIN_ADJUSTMENT: { label: "Marine Adjustment", icon: "⚓", color: "info" },
  TRAP: { label: "Marine Trap", icon: "⚓", color: "danger" },
  CHECKPOINT: { label: "Island Checkpoint", icon: "📍", color: "info" },
  ROAD_PONEGLYPH: { label: "Road Poneglyph", icon: "🗺️", color: "gold" },
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
      .catch(() => setError("Could not load bounty history."));
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

  const totalBounty = history.reduce((sum, tx) => sum + (tx.points || 0), 0);
  const positiveBounty = history.filter((tx) => tx.points > 0).reduce((sum, tx) => sum + tx.points, 0);

  return (
    <div>
      <div className="topbar">
        <span className="brand">
          <Link to="/" style={{ color: "inherit" }}>
            🏴‍☠️ CAMPUS 404
          </Link>
        </span>
        <div className="links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/scan">Scan Poneglyph</Link>
          <Link to="/map">Grand Line Map</Link>
          <Link to="/leaderboard">Bounty Board</Link>
        </div>
      </div>

      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📜</div>
          <h1 style={{ fontFamily: "var(--font-display)", color: "var(--gold)", margin: 0 }}>
            Bounty Ledger
          </h1>
          <p className="muted" style={{ fontFamily: "var(--font-parchment)", fontStyle: "italic", fontSize: 16 }}>
            A captain's record of every bounty earned and lost
          </p>
        </div>

        {/* Summary */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat">
            <div className="num" style={{ color: "var(--gold)" }}>
              {totalBounty}
            </div>
            <div className="lbl">💰 Net Bounty</div>
          </div>
          <div className="stat">
            <div className="num" style={{ color: "var(--ok)" }}>
              +{positiveBounty}
            </div>
            <div className="lbl">📈 Bounty Earned</div>
          </div>
          <div className="stat">
            <div className="num">{history.length}</div>
            <div className="lbl">📋 Transactions</div>
          </div>
          <div className="stat">
            <div className="num">{sortedLevels.length}</div>
            <div className="lbl">🏝️ Islands Explored</div>
          </div>
        </div>

        {error && <div className="alert error">{error}</div>}

        {history.length === 0 ? (
          <div className="card muted" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>⚓</div>
            <h3>No bounty transactions yet, pirate.</h3>
            <p>Start your voyage to earn bounty on the Grand Line.</p>
            <Link to="/dashboard" className="btn" style={{ marginTop: 12 }}>
              🗿 Start Scanning
            </Link>
          </div>
        ) : (
          sortedLevels.map((level) => {
            const txs = groupedByLevel[level];
            const levelNet = txs.reduce((sum, tx) => sum + (tx.points || 0), 0);
            const islandName = level === 0 ? "Unknown Island" : level === sortedLevels[sortedLevels.length - 1] ? `Island ${level} — Final` : `Island ${level}`;
            const islaIcon = level === sortedLevels[sortedLevels.length - 1] && level > 0 ? "🏴‍☠️" : "🏝️";

            return (
              <div key={level} className="card" style={{ marginBottom: 16 }}>
                <div className="spread" style={{ marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", color: "var(--gold)" }}>
                    {islaIcon} {islandName}
                  </h3>
                  <span className={`pill ${levelNet >= 0 ? "ok" : "danger"}`}>
                    {levelNet >= 0 ? "+" : ""}{levelNet} bounty
                  </span>
                </div>

                <table className="board">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Bounty</th>
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
          <Link to="/dashboard">← Return to the Grand Line</Link>
        </p>
      </div>
    </div>
  );
}
