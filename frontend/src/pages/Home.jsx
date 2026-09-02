import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

const STATUS_LABEL = {
  NOT_STARTED: "Not started",
  ACTIVE: "Active",
  PAUSED: "Paused",
  ENDED: "Ended",
};

const LEVEL_ICONS = ["", "🏝️", "🌊", "☁️", "⚔️", "🏰", "🏴‍☠️"];

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
  const { isLoggedIn } = useAuth();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/event/status")
      .then((a) => {
        setEvent(a.event);
      })
      .catch(() => setError("Could not reach the game server."));
  }, []);

  return (
    <>
      {/* HERO */}
      <div className="hero">
        <div className="brand-flag">🏴‍☠️</div>
        <h1>THE LOST TREASURE</h1>
        <div className="subtitle">The treasure is hidden. The clues are scattered. Your adventure begins now.</div>
        <p className="tagline">
          "The greatest treasure is waiting somewhere on campus."
        </p>
        <div className="row" style={{ justifyContent: "center", marginTop: 20 }}>
          {isLoggedIn ? (
            <Link to="/dashboard" className="btn">🗺️ Enter the Hunt</Link>
          ) : (
            <>
              <Link to="/register" className="btn">🏴‍☠️ Register Your Team</Link>
              <Link to="/login" className="btn secondary">🧭 Start</Link>
            </>
          )}
          <Link to="/leaderboard" className="btn ghost">💰 Leaderboard</Link>
          {isLoggedIn && (
            <Link to="/scan" className="btn ghost">🗿 Scan QR Code</Link>
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
                <div className="muted" style={{ fontFamily: "var(--font-heading)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>Hunt Status</div>
                <div style={{ marginTop: 6 }}>{statusPill(event.status)}</div>
              </div>
              <div>
                <div className="muted" style={{ fontFamily: "var(--font-heading)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>Timer</div>
                <div className="timer">🧭 {fmtMs(event.remainingMs)}</div>
              </div>
              <div>
                <div className="muted" style={{ fontFamily: "var(--font-heading)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11 }}>Hunt Duration</div>
                <div className="mono" style={{ marginTop: 4 }}>{event.duration} min</div>
              </div>
            </div>
          </div>
        )}

        {/* Story section */}
        <div className="story-section">
          <div className="parchment animate-fade-in">
            <h2>⚓ The Hunt Has Begun</h2>
            <p>Clues have been scattered across campus, hidden in plain sight.</p>
            <p>Each clue leads you closer to the greatest treasure in history.</p>
            <p>Only the team capable of following the trail can reach <strong style={{ color: "var(--gold)" }}>the Final Treasure</strong>.</p>
            <p style={{ fontSize: 16 }}>Gather your team. Follow the clues. Avoid the wrong QR codes. Earn the highest score.</p>
            <p>And discover...</p>
            <div className="one-piece-text">🏴‍☠️ THE FINAL TREASURE</div>
            {!isLoggedIn && (
              <Link to="/register" className="btn" style={{ marginTop: 20 }}>
                ⚔️ Start the Adventure
              </Link>
            )}
          </div>
        </div>


        <p className="muted" style={{ textAlign: "center", marginTop: 32, fontFamily: "var(--font-heading)" }}>
          Game Master? <Link to="/admin/login">⚓ Admin Panel</Link>
        </p>
      </div>
    </>
  );
}
