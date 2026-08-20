import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

const STATUS_LABEL = {
  NOT_STARTED: "Not started",
  ACTIVE: "Sailing",
  PAUSED: "Anchored",
  ENDED: "Voyage complete",
};

const ISLAND_ICONS = ["", "🏝️", "🌊", "☁️", "⚔️", "🏰", "🏴‍☠️"];

function statusPill(status) {
  const map = { ACTIVE: "ok", NOT_STARTED: "warn", PAUSED: "warn", ENDED: "danger" };
  return <span className={`pill ${map[status] || "info"}`}>{STATUS_LABEL[status] || status}</span>;
}

function fmtMs(ms) {
  if (ms == null || ms <= 0) return "—";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function Home() {
  const { isLoggedIn, team, logout } = useAuth();
  const [event, setEvent] = useState(null);
  const [board, setBoard] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/event/status").catch(() => ({ event: null })),
      api.get("/leaderboard").catch(() => ({ leaderboard: [] })),
    ])
      .then(([a, b]) => {
        setEvent(a.event);
        setBoard(b.leaderboard || []);
      })
      .catch(() => setError("Could not reach the game server."));
  }, []);

  return (
    <>
      {isLoggedIn && (
        <div className="topbar">
          <span className="brand">
            <Link to="/" style={{ color: "inherit" }}>🏴‍☠️ CAMPUS 404</Link>
          </span>
          <div className="links">
            <span className="muted">{team?.teamName}</span>
            <Link to="/dashboard">Dashboard</Link>
            <button className="btn small ghost" onClick={logout}>Logout</button>
          </div>
        </div>
      )}

      {/* HERO — Grand Line Entrance */}
      <div className="hero">
        <div className="brand-flag">🏴‍☠️</div>
        <h1>CAMPUS 404</h1>
        <div className="subtitle">The Grand Line Has Arrived</div>
        <p className="tagline">
          "The greatest treasure is waiting somewhere on campus."
        </p>
        <div className="row" style={{ justifyContent: "center", marginTop: 20 }}>
          {isLoggedIn ? (
            <Link to="/dashboard" className="btn">⚓ Enter the Grand Line</Link>
          ) : (
            <>
              <Link to="/register" className="btn">🏴‍☠️ Register Your Crew</Link>
              <Link to="/login" className="btn secondary">🧭 Set Sail</Link>
            </>
          )}
          <Link to="/leaderboard" className="btn ghost">💰 Bounty Board</Link>
          {isLoggedIn && (
            <Link to="/scan" className="btn ghost">🗿 Scan Poneglyph</Link>
          )}
        </div>
      </div>

      {/* Wave divider */}
      <div className="wave-container">
        <svg className="wave" viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ fill: "rgba(13,40,68,0.15)" }}>
          <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z" />
        </svg>
        <svg className="wave" viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ fill: "rgba(13,40,68,0.1)" }}>
          <path d="M0,50 C360,10 720,70 1080,30 C1260,15 1380,45 1440,50 L1440,80 L0,80 Z" />
        </svg>
      </div>

      <div className="container">
        {error && <div className="alert error">{error}</div>}

        {/* Event status */}
        {event && (
          <div className="card animate-fade-in">
            <div className="spread">
              <div>
                <div className="muted" style={{ fontFamily: "var(--font-heading)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>Voyage Status</div>
                <div style={{ marginTop: 6 }}>{statusPill(event.status)}</div>
              </div>
              <div>
                <div className="muted" style={{ fontFamily: "var(--font-heading)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>Log Pose Timer</div>
                <div className="timer">🧭 {fmtMs(event.remainingMs)}</div>
              </div>
              <div>
                <div className="muted" style={{ fontFamily: "var(--font-heading)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>Voyage Duration</div>
                <div className="mono" style={{ marginTop: 4 }}>{event.duration} min</div>
              </div>
            </div>
          </div>
        )}

        {/* Story section */}
        <div className="story-section">
          <div className="parchment animate-fade-in">
            <h2>⚓ The Grand Line Has Appeared</h2>
            <p>Ancient Poneglyphs have been discovered across the campus.</p>
            <p>Hidden among them are clues leading to the greatest treasure in history.</p>
            <p>Only the crew capable of following the trail can reach <strong style={{ color: "var(--gold)" }}>Laugh Tale</strong>.</p>
            <p style={{ fontSize: 16 }}>Gather your crew. Follow the Poneglyphs. Survive the Marine traps. Earn the highest bounty.</p>
            <p>And discover...</p>
            <div className="one-piece-text">🏴‍☠️ THE ONE PIECE</div>
            {!isLoggedIn && (
              <Link to="/register" className="btn" style={{ marginTop: 20 }}>
                ⚔️ Start the Adventure
              </Link>
            )}
          </div>
        </div>

        {/* Bounty Board preview */}
        <h3 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", letterSpacing: "0.05em" }}>
          🏴‍☠️ Bounty Board
        </h3>
        {board.length === 0 ? (
          <div className="card muted" style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>💰</div>
            No pirate crews have set sail yet. Be the first to earn bounty.
          </div>
        ) : (
          <div className="card">
            <table className="board top3">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Crew</th>
                  <th>Island</th>
                  <th>Progress</th>
                  <th>Bounty</th>
                </tr>
              </thead>
              <tbody>
                {board.slice(0, 10).map((t) => (
                  <tr key={t.teamId}>
                    <td className={`rank ${t.rank <= 3 ? "accent" : ""}`}>
                      {t.rank === 1 ? "🥇" : t.rank === 2 ? "🥈" : t.rank === 3 ? "🥉" : t.rank}
                    </td>
                    <td>
                      <strong>{t.teamName}</strong>{" "}
                      <span className="muted mono" style={{ fontSize: 12 }}>({t.teamId})</span>
                    </td>
                    <td className="mono">{ISLAND_ICONS[t.currentLevel || 1]} Lvl {t.currentLevel || 1}</td>
                    <td className="muted">{t.progress} solved</td>
                    <td className="mono" style={{ color: "var(--gold)" }}>💰 {t.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="muted" style={{ textAlign: "center", marginTop: 32, fontFamily: "var(--font-heading)" }}>
          Game Master? <Link to="/admin/login">⚓ Marine Headquarters</Link>
        </p>
      </div>
    </>
  );
}
