import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

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
  const [board, setBoard] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/leaderboard")
      .then((data) => setBoard(data.leaderboard || []))
      .catch(() => setError("Could not load the Bounty Board."));
  }, []);

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
        </div>
      </div>

      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💰</div>
          <h1 style={{ fontFamily: "var(--font-display)", color: "var(--gold)", margin: 0 }}>
            Bounty Board
          </h1>
          <p className="muted" style={{ fontFamily: "var(--font-parchment)", fontStyle: "italic", fontSize: 16 }}>
            The most wanted pirate crews on the Grand Line
          </p>
        </div>

        {error && <div className="alert error">{error}</div>}

        {board.length === 0 ? (
          <div className="card muted" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>⚓</div>
            <h3>No crews have set sail yet</h3>
            <p>Be the first to earn bounty on the Grand Line.</p>
            <Link to="/register" className="btn" style={{ marginTop: 12 }}>
              🏴‍☠️ Register Your Crew
            </Link>
          </div>
        ) : (
          <div className="card">
            <table className="board top3">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Crew</th>
                  <th>Island</th>
                  <th>Poneglyphs</th>
                  <th>Time</th>
                  <th>Bounty</th>
                </tr>
              </thead>
              <tbody>
                {board.map((t) => (
                  <tr key={t.teamId} className={team && t.teamId === team.teamId ? "me" : ""}>
                    <td className="rank">{rankEmoji(t.rank)}</td>
                    <td>
                      <strong>{t.teamName}</strong>{" "}
                      <span className="muted mono" style={{ fontSize: 12 }}>
                        ({t.teamId})
                      </span>
                      {t.completed && (
                        <span className="pill ok" style={{ marginLeft: 6 }}>
                          🏴‍☠️ Found One Piece
                        </span>
                      )}
                    </td>
                    <td className="mono">
                      {ISLAND_ICONS[t.currentLevel || 1]} {t.currentLevel || 1}
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

        <p className="muted" style={{ textAlign: "center", marginTop: 24, fontFamily: "var(--font-heading)" }}>
          <Link to="/dashboard">← Return to the Grand Line</Link>
        </p>
      </div>
    </div>
  );
}
