import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

const ISLAND_ICONS = ["", "🏝️", "🌊", "☁️", "⚔️", "🏰", "🏴‍☠️"];

const DEFAULT_NAMES = {
  1: "Loguetown", 2: "Baratie", 3: "Arlong Park", 4: "Alabasta",
  5: "Skypiea", 6: "Water 7", 7: "Thriller Bark", 8: "Sabaody Archipelago",
  9: "Marineford", 10: "Fish-Man Island", 11: "Dressrosa", 12: "Whole Cake Island", 13: "Wano Country",
};

export default function GrandLineMap() {
  const { team, token } = useAuth();
  const [me, setMe] = useState(null);
  const [islandNames, setIslandNames] = useState({});
  const [totalLevels, setTotalLevels] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get("/teams/me", { token }),
      api.get("/event/status"),
    ]).then(([meData, evData]) => {
      setMe(meData);
      setTotalLevels(meData.totalLevels || meData.totalClues || 0);
      setIslandNames(evData.event?.islandNames || {});
    }).catch(() => setError("Could not load Grand Line map data."));
  }, [token]);

  const getIslandName = (level, total) => {
    if (level === total) return "Laugh Tale";
    return islandNames[level] || DEFAULT_NAMES[level] || `Island ${level}`;
  };

  const teamData = me?.team || team;
  const currentLevel = teamData?.currentLevel || teamData?.currentClue || 1;
  const completedLevels = teamData?.completedLevels || [];
  const solvedClues = teamData?.solvedClues || [];

  return (
    <div>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🧭</div>
          <h1 style={{ fontFamily: "var(--font-display)", color: "var(--gold)", margin: 0 }}>
            The Grand Line
          </h1>
          <p className="muted" style={{ fontFamily: "var(--font-parchment)", fontStyle: "italic", fontSize: 16 }}>
            Your voyage through the New World
          </p>
        </div>

        {error && <div className="alert error">{error}</div>}

        {totalLevels > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="spread" style={{ marginBottom: 8 }}>
              <span className="muted" style={{ fontFamily: "var(--font-heading)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Voyage Progress
              </span>
              <span className="mono" style={{ color: "var(--gold)", fontSize: 14 }}>
                {completedLevels.length} / {totalLevels} Islands Conquered
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

        <div className="log-pose-card" style={{ marginBottom: 24 }}>
          <h3>🧭 Log Pose Reading</h3>
          <div className="destination">
            {teamData?.status === "completed"
              ? "🏴‍☠️ LAUGH TALE REACHED!"
              : getIslandName(currentLevel, totalLevels)}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            {teamData?.status === "completed"
              ? "You have found the One Piece! The greatest treasure is yours."
              : `Follow the Log Pose to ${getIslandName(currentLevel, totalLevels)}. Find the QR Code and decode its message.`}
          </p>
        </div>

        <div className="grand-line-map">
          {totalLevels > 0 ? (
            Array.from({ length: totalLevels }, (_, i) => {
              const level = i + 1;
              const isCompleted = completedLevels.includes(level);
              const isCurrent = level === currentLevel && teamData?.status !== "completed";
              const isLocked = level > currentLevel;
              const solved = solvedClues.find((s) => s.clueNumber === level);

              const icon = level === totalLevels ? "🏴‍☠️" : ISLAND_ICONS[level] || "🏝️";
              const name = getIslandName(level, totalLevels);

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
                          ? `Decoded! +${solved.pointsEarned} points`
                          : isCurrent
                          ? "Currently here — find the QR Code!"
                          : isLocked
                          ? "Locked — complete previous islands first"
                          : ""}
                      </p>
                    </div>
                    <div className="island-status">
                      {isCompleted ? "✅" : isCurrent ? "🧭" : "🔒"}
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
              <h3>The Grand Line is being charted...</h3>
              <p>No islands have been discovered yet. The voyage will begin soon.</p>
            </div>
          )}
        </div>

        <p className="muted" style={{ textAlign: "center", marginTop: 24, fontFamily: "var(--font-heading)" }}>
          <Link to="/dashboard">← Return to the Grand Line</Link>
        </p>
      </div>
    </div>
  );
}
