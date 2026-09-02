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
  const [selectedNode, setSelectedNode] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.get("/teams/me", { token })
      .then((meData) => {
        setMe(meData);
        setTotalLevels(meData.totalLevels || meData.totalClues || 0);
        if (meData.team?.eventId) {
          api.get(`/events/${meData.team.eventId}`, { token })
            .then((evData) => setIslandNames(evData.islandNames || {}))
            .catch(() => {});
        }
      })
      .catch(() => setError("Could not load Grand Line map data."));
  }, [token]);

  const getIslandName = (level, total) => {
    if (level === total) return "Laugh Tale (Final Treasure)";
    return islandNames[level] || DEFAULT_NAMES[level] || `Island ${level}`;
  };

  const teamData = me?.team || team;
  const currentLevel = teamData?.currentLevel || teamData?.currentClue || 1;
  const completedLevels = teamData?.completedLevels || [];
  const solvedClues = teamData?.solvedClues || [];

  return (
    <div>
      <div className="container" style={{ maxWidth: 880 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🧭</div>
          <h1 style={{ fontFamily: "var(--font-display)", color: "var(--gold)", margin: 0 }}>
            THE GRAND LINE TREASURE MAP
          </h1>
          <p className="muted" style={{ fontFamily: "var(--font-parchment)", fontStyle: "italic", fontSize: 16 }}>
            Chart your pirate crew's voyage across the sea
          </p>
        </div>

        {error && <div className="alert error">{error}</div>}

        {totalLevels > 0 && (
          <div className="card" style={{ marginBottom: 24, background: "var(--bg-2)", borderLeft: "4px solid var(--gold)" }}>
            <div className="spread" style={{ marginBottom: 8 }}>
              <span className="muted" style={{ fontFamily: "var(--font-heading)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Voyage Progress
              </span>
              <span className="mono" style={{ color: "var(--gold)", fontSize: 14 }}>
                {completedLevels.length} / {totalLevels} Islands Conquered
              </span>
            </div>
            <div style={{ background: "rgba(13,15,20,0.6)", borderRadius: 999, height: 10, border: "1px solid rgba(212,168,67,0.2)" }}>
              <div
                style={{
                  background: "linear-gradient(90deg, #10b981, #f59e0b)",
                  borderRadius: 999,
                  height: "100%",
                  width: `${totalLevels > 0 ? (completedLevels.length / totalLevels) * 100 : 0}%`,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Nautical Parchment Map Container */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            border: "2px solid var(--gold)",
            borderRadius: 12,
            padding: "28px 24px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            marginBottom: 24,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700, letterSpacing: "0.05em" }}>
              ⛵ CREW LOCATION: LEVEL {currentLevel}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Click unlocked nodes to inspect island details
            </div>
          </div>

          <div className="grand-line-map" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {totalLevels > 0 ? (
              Array.from({ length: totalLevels }, (_, i) => {
                const level = i + 1;
                const isCompleted = completedLevels.includes(level);
                const isCurrent = level === currentLevel && teamData?.status !== "completed";
                const isLocked = level > currentLevel;
                const solved = solvedClues.find((s) => s.clueNumber === level);

                const icon = level === totalLevels ? "🏆" : ISLAND_ICONS[level] || "🏝️";
                const name = getIslandName(level, totalLevels);

                return (
                  <div key={level} style={{ position: "relative" }}>
                    <div
                      className={`island-node ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""} ${isLocked ? "locked" : ""}`}
                      onClick={() => !isLocked && setSelectedNode({ level, name, solved, isCurrent, isCompleted })}
                      style={{
                        padding: "16px 20px",
                        borderRadius: 8,
                        background: isCurrent
                          ? "rgba(245, 158, 11, 0.15)"
                          : isCompleted
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(30, 41, 59, 0.6)",
                        border: isCurrent
                          ? "2px solid var(--gold)"
                          : isCompleted
                          ? "1px solid var(--event-primary, #10b981)"
                          : "1px dashed var(--border)",
                        filter: isLocked ? "blur(3px) opacity(0.35)" : "none",
                        cursor: isLocked ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div className="island-icon" style={{ fontSize: 28 }}>{icon}</div>
                      <div className="island-info" style={{ flex: 1, marginLeft: 16 }}>
                        <h4 style={{ margin: 0, fontSize: 16, color: isCurrent ? "var(--gold)" : "var(--text)" }}>
                          Level {level}: {name} {isCurrent && <span style={{ fontSize: 14 }}>⛵ (Current Ship Station)</span>}
                        </h4>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                          {isCompleted && solved
                            ? `Decoded Clue "${solved.title || "Clue Solved"}"! +${solved.pointsEarned} pts`
                            : isCurrent
                            ? "Current Destination — Find and scan the QR Code on campus!"
                            : isLocked
                            ? "🔒 Uncharted Waters — Complete previous level first"
                            : "Unlocked"}
                        </p>
                      </div>
                      <div className="island-status" style={{ fontSize: 20 }}>
                        {isCompleted ? "✅" : isCurrent ? "🧭" : "🔒"}
                      </div>
                    </div>

                    {level < totalLevels && (
                      <div
                        style={{
                          width: 2,
                          height: 16,
                          margin: "0 auto",
                          background: isCompleted ? "var(--event-primary, #10b981)" : "var(--border)",
                        }}
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="card muted" style={{ textAlign: "center", padding: 48 }}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>🗺️</div>
                <h3>The Grand Line map is being charted...</h3>
              </div>
            )}
          </div>
        </div>

        {/* Selected Island Inspector Modal / Card */}
        {selectedNode && (
          <div className="card animate-fade-in" style={{ marginBottom: 24, background: "var(--bg-2)", borderLeft: "4px solid var(--gold)" }}>
            <div className="spread">
              <h3 style={{ margin: 0, color: "var(--gold)" }}>📍 Island Log Details: {selectedNode.name}</h3>
              <button className="btn small ghost" onClick={() => setSelectedNode(null)}>Dismiss</button>
            </div>
            <div style={{ marginTop: 12, fontSize: 14 }}>
              <p><strong>Level Number:</strong> {selectedNode.level}</p>
              <p><strong>Voyage Status:</strong> {selectedNode.isCompleted ? "✅ Conquered & Solved" : selectedNode.isCurrent ? "🧭 Active Log Pose Station" : "🔒 Uncharted"}</p>
              {selectedNode.solved && (
                <p><strong>Points Earned:</strong> <span style={{ color: "var(--gold)" }}>+{selectedNode.solved.pointsEarned} pts</span></p>
              )}
            </div>
          </div>
        )}

        <p className="muted" style={{ textAlign: "center", marginTop: 24, fontFamily: "var(--font-heading)" }}>
          <Link to="/dashboard">← Return to Dashboard</Link>
        </p>
      </div>
    </div>
  );
}
