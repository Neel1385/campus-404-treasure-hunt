import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function GrandLineMap() {
  const { team, token } = useAuth();
  const [me, setMe] = useState(null);
  const [totalLevels, setTotalLevels] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.get("/teams/me", { token })
      .then((meData) => {
        setMe(meData);
        setTotalLevels(meData.totalLevels || meData.totalClues || 0);
      })
      .catch(() => setError("Could not load level map data."));
  }, [token]);

  const teamData = me?.team || team;
  const currentLevel = teamData?.currentLevel || teamData?.currentClue || 1;
  const completedLevels = teamData?.completedLevels || [];
  const solvedClues = teamData?.solvedClues || [];

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
          <Link to="/leaderboard">Leaderboard</Link>
          <Link to="/score-history">Score History</Link>
        </div>
      </div>

      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🧭</div>
          <h1 style={{ fontFamily: "var(--font-display)", color: "var(--gold)", margin: 0 }}>
            YOUR PROGRESS
          </h1>
          <p className="muted" style={{ fontFamily: "var(--font-parchment)", fontStyle: "italic", fontSize: 16 }}>
            Your journey through the treasure hunt
          </p>
        </div>

        {error && <div className="alert error">{error}</div>}

        {totalLevels > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="spread" style={{ marginBottom: 8 }}>
              <span className="muted" style={{ fontFamily: "var(--font-heading)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Progress
              </span>
              <span className="mono" style={{ color: "var(--gold)", fontSize: 14 }}>
                {completedLevels.length} / {totalLevels} Levels Completed
              </span>
            </div>
            <div style={{ background: "rgba(13,15,20,0.6)", borderRadius: 999, height: 8, border: "1px solid rgba(212,168,67,0.1)" }}>
              <div
                style={{
                  background: "linear-gradient(90deg, var(--ok), var(--gold))",
                  borderRadius: 999,
                  height: "100%",
                  width: `${totalLevels > 0 ? (completedLevels.length / totalLevels) * 100 : 0}%`,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Current Mission Card */}
        <div className="log-pose-card" style={{ marginBottom: 24 }}>
          <h3>📍 Current Mission</h3>
          <div className="destination">
            {teamData?.status === "completed"
              ? "🏴‍☠️ FINAL TREASURE REACHED!"
              : `Level ${currentLevel}`}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            {teamData?.status === "completed"
              ? "You have found the Final Treasure! Congratulations!"
              : `Find the QR Code for Level ${currentLevel}. Scan it to unlock your next clue.`}
          </p>
        </div>

        {/* Level progression */}
        <div className="grand-line-map">
          {totalLevels > 0 ? (
            Array.from({ length: totalLevels }, (_, i) => {
              const level = i + 1;
              const isCompleted = completedLevels.includes(level);
              const isCurrent = level === currentLevel && teamData?.status !== "completed";
              const isLocked = level > currentLevel;
              const solved = solvedClues.find((s) => s.clueNumber === level);

              const isFinal = level === totalLevels;
              const icon = isFinal ? "🏴‍☠️" : "🏝️";
              const name = isFinal ? "Final Treasure" : `Level ${level}`;

              return (
                <div key={level}>
                  <div
                    className={`island-node ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""} ${isLocked ? "locked" : ""}`}
                  >
                    <div className="island-icon">{icon}</div>
                    <div className="island-info">
                      <h4>{name}</h4>
                      <p>
                        {isCompleted && solved
                          ? `Completed! +${solved.pointsEarned} points`
                          : isCurrent
                          ? "Currently here — find the QR Code!"
                          : isLocked
                          ? "Locked — complete previous levels first"
                          : ""}
                      </p>
                    </div>
                    <div className="island-status">
                      {isCompleted ? "✅" : isCurrent ? "🔍" : "🔒"}
                    </div>
                  </div>
                  {level < totalLevels && (
                    <div className={`island-connector ${isCompleted ? "completed" : ""}`} />
                  )}
                </div>
              );
            })
          ) : (
            <div className="card muted" style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>🗺️</div>
              <h3>No levels available yet...</h3>
              <p>The treasure hunt hasn't started. Stay tuned!</p>
            </div>
          )}
        </div>

        <p className="muted" style={{ textAlign: "center", marginTop: 24, fontFamily: "var(--font-heading)" }}>
          <Link to="/dashboard">← Back to Dashboard</Link>
        </p>
      </div>
    </div>
  );
}
