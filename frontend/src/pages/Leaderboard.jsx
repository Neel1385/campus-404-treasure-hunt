import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useEvent } from "../EventContext.jsx";

const ISLAND_ICONS = ["", "🏝️", "🌊", "☁️", "⚔️", "🏰", "🏴‍☠️"];

function fmtTime(iso) {
  if (!iso) return "Sailing...";
  return new Date(iso).toLocaleString();
}

function rankEmoji(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

export default function Leaderboard() {
  const { team } = useAuth();
  const { currentEvent } = useEvent();
  const [board, setBoard] = useState([]);
  const [error, setError] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    const endpoint = currentEvent?._id ? `/events/${currentEvent._id}/leaderboard` : "/leaderboard";
    api
      .get(endpoint)
      .then((data) => {
        const list = Array.isArray(data) ? data : data.leaderboard || [];
        setBoard(list);
      })
      .catch(() => setError("Could not load the leaderboard."));
  }, [currentEvent]);

  return (
    <div>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💰</div>
          <h1 style={{ fontFamily: "var(--font-display)", color: "var(--gold)", margin: 0 }}>
            LEADERBOARD {currentEvent ? `— ${currentEvent.name}` : ""}
          </h1>
          <p className="muted" style={{ fontFamily: "var(--font-parchment)", fontStyle: "italic", fontSize: 16 }}>
            The top treasure hunters on the leaderboard
          </p>
        </div>

        {error && <div className="alert error">{error}</div>}

        {board.length === 0 ? (
          <div className="card muted" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>⚓</div>
            <h3>No teams have started yet. Be the first!</h3>
            <Link to="/register" className="btn" style={{ marginTop: 12 }}>
              🏴‍☠️ Register Your Team
            </Link>
          </div>
        ) : (
          <div className="card">
            <table className="board top3">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Level</th>
                  <th>Clues Solved</th>
                  <th>Time</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {board.map((t) => (
                  <tr
                    key={t.teamId}
                    className={team && t.teamId === team.teamId ? "me" : ""}
                    onClick={() => setSelectedTeam(t)}
                    style={{ cursor: "pointer" }}
                    title="Click to inspect team details"
                  >
                    <td className="rank">{rankEmoji(t.rank)}</td>
                    <td>
                      <strong style={{ color: "var(--gold)" }}>{t.teamName}</strong>{" "}
                      <span className="muted mono" style={{ fontSize: 12 }}>
                        ({t.teamId})
                      </span>
                      {t.completed && (
                        <span className="pill ok" style={{ marginLeft: 6 }}>
                          🏴‍☠️ Found Final Treasure
                        </span>
                      )}
                    </td>
                    <td className="mono">
                      {ISLAND_ICONS[t.currentLevel || 1] || "🏝️"} {t.currentLevel || 1}
                    </td>
                    <td className="muted">{t.progress} decoded</td>
                    <td className="muted mono">{t.completed ? fmtTime(t.completionTime) : "—"}</td>
                    <td className="mono" style={{ color: "var(--gold)", fontWeight: 700 }}>
                      💰 {t.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedTeam && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 24,
            }}
            onClick={() => setSelectedTeam(null)}
          >
            <div
              className="card"
              style={{ maxWidth: 540, width: "100%", padding: 32, background: "var(--bg-2, #1e293b)", border: "1px solid var(--gold)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="spread" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0, color: "var(--gold)" }}>🏴‍☠️ Team Details: {selectedTeam.teamName}</h3>
                <button className="btn small ghost" onClick={() => setSelectedTeam(null)}>✖</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div><strong>Team ID:</strong> <span className="mono">{selectedTeam.teamId}</span></div>
                <div><strong>Current Level:</strong> Level {selectedTeam.currentLevel || 1}</div>
                <div><strong>Total Points:</strong> <b style={{ color: "var(--gold)" }}>{selectedTeam.points}</b></div>
                <div><strong>Status:</strong> {selectedTeam.status || "Active"}</div>
                <div><strong>Wrong QR Scans:</strong> {selectedTeam.wrongScans || 0}</div>
                <div><strong>Clues Solved:</strong> {selectedTeam.solvedClues?.length || 0}</div>
              </div>

              {selectedTeam.collectedSecretFragments?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--gold)" }}>🧩 Secret Code Fragments:</h4>
                  <div className="row" style={{ gap: 6 }}>
                    {selectedTeam.collectedSecretFragments.map((frag, idx) => (
                      <span key={idx} className="pill ok mono">{frag}</span>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn small" style={{ width: "100%", marginTop: 8 }} onClick={() => setSelectedTeam(null)}>
                Close Inspector
              </button>
            </div>
          </div>
        )}

        <p className="muted" style={{ textAlign: "center", marginTop: 24, fontFamily: "var(--font-heading)" }}>
          <Link to="/dashboard">← Return to the Dashboard</Link>
        </p>
      </div>
    </div>
  );
}
