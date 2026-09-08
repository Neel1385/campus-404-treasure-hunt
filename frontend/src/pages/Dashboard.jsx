import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useEvent } from "../EventContext.jsx";
import { cacheTeamSession, getCachedTeamSession, getPendingOperations, removePendingOperation } from "../offlineStorage.js";

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
  SIDE_QUEST: { label: "Side Quest Completed", color: "ok" },
  FINAL_CHALLENGE: { label: "Final Treasure", color: "ok" },
  ADMIN_ADJUSTMENT: { label: "Admin Adjustment", color: "info" },
  TRAP: { label: "Wrong QR", color: "danger" },
  CHECKPOINT: { label: "Checkpoint", color: "info" },
  ROAD_PONEGLYPH: { label: "Special QR", color: "ok" },
};

function SideQuestItem({ quest, completed, questAnswers, setQuestAnswers, submitSideQuest, busy }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="card"
      style={{
        background: "var(--bg-2)",
        marginBottom: 8,
        padding: 14,
        cursor: "pointer",
        borderLeft: expanded ? "4px solid var(--gold)" : "none",
        transition: "all 0.2s ease",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="spread">
        <div>
          <strong style={{ fontSize: 15, color: "var(--gold)" }}>🎯 {quest.title}</strong> —{" "}
          <span style={{ color: "var(--gold-light)", fontWeight: 600 }}>+{quest.points} pts</span>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {expanded ? "▲ Click to collapse question" : "▼ Click to reveal riddle & submit form"}
          </div>
        </div>
        {completed ? (
          <span className="pill ok">Completed</span>
        ) : (
          <span className="pill warn">Unsolved</span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
          <p style={{ fontSize: 14, margin: "0 0 12px", color: "var(--text)", lineHeight: 1.5 }}>
            <strong>Riddle / Question:</strong> {quest.description}
          </p>
          {!completed && (
            <div className="row" style={{ gap: 8 }}>
              <input
                placeholder="Type your answer here..."
                value={questAnswers[quest._id] || ""}
                onChange={(e) => setQuestAnswers({ ...questAnswers, [quest._id]: e.target.value })}
                style={{ flex: 1 }}
              />
              <button className="btn small ok" onClick={() => submitSideQuest(quest._id)} disabled={busy}>
                Submit Answer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { team, token, logout } = useAuth();
  const { currentEvent } = useEvent();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [clue, setClue] = useState(null);
  const [history, setHistory] = useState([]);
  const [sideQuests, setSideQuests] = useState([]);
  const [questAnswers, setQuestAnswers] = useState({});
  const [answer, setAnswer] = useState("");
  const [secretCodeInput, setSecretCodeInput] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const syncPending = useCallback(async () => {
    if (!currentEvent?._id || !token || !navigator.onLine) return;
    try {
      const ops = await getPendingOperations(currentEvent._id);
      if (ops && ops.length > 0) {
        const syncRes = await api.post(`/events/${currentEvent._id}/sync`, { operations: ops }, { token });
        if (syncRes && syncRes.length > 0) {
          for (const item of syncRes) {
            await removePendingOperation(item.operationId);
          }
        }
      }
    } catch {
      /* ignore sync errors */
    }
  }, [currentEvent?._id, token]);

  const load = useCallback(async () => {
    const eventIdParam = currentEvent?._id ? `?eventId=${currentEvent._id}` : "";
    try {
      await syncPending();

      const [meData, clueData, histData, questsData, assignData] = await Promise.all([
        api.get(`/teams/me${eventIdParam}`, { token }),
        api.get(`/game/current-clue${eventIdParam}`, { token }),
        api.get(`/game/score-history${eventIdParam}`, { token }),
        currentEvent?._id ? api.get(`/events/${currentEvent._id}/side-quests`, { token }).catch(() => []) : Promise.resolve([]),
        api.get(`/game/my-assignments${eventIdParam}`, { token }).catch(() => ({ assignments: [] })),
      ]);

      setMe(meData);
      setClue(clueData);
      setHistory(histData.history || []);
      setSideQuests(Array.isArray(questsData) ? questsData : []);

      if (currentEvent?._id) {
        await cacheTeamSession(currentEvent._id, {
          meData,
          clueData,
          histData,
          questsData: Array.isArray(questsData) ? questsData : [],
          assignments: assignData.assignments || [],
        });
      }
    } catch (err) {
      if (!navigator.onLine && currentEvent?._id) {
        const cached = await getCachedTeamSession(currentEvent._id);
        if (cached) {
          setMe(cached.meData);
          setClue(cached.clueData);
          setHistory(cached.histData?.history || []);
          setSideQuests(cached.questsData || []);
          return;
        }
      }
      throw err;
    }
  }, [token, currentEvent, syncPending]);

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

  const submitFinalSecretCode = async (e) => {
    e.preventDefault();
    if (!currentEvent?._id || !secretCodeInput) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await api.post(`/events/${currentEvent._id}/final-challenge/try-code`, { secretCode: secretCodeInput }, { token });
      setNotice(res.message);
      setSecretCodeInput("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitSideQuest = async (questId) => {
    if (!currentEvent?._id) return;
    const ans = questAnswers[questId] || "";
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await api.post(`/events/${currentEvent._id}/side-quests/${questId}/complete`, { answer: ans }, { token });
      setNotice(res.message || "Side quest completed!");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const teamData = me?.team || team;
  const isComplete = teamData?.status === "completed";
  const isTimeUp = (me?.event?.remainingMs != null && me.event.remainingMs <= 0) || me?.event?.status === "ENDED" || currentEvent?.status === "ENDED";
  const unlocked = !!clue?.unlocked;
  const currentLevel = teamData?.currentLevel || teamData?.currentClue || 1;
  const totalLevels = me?.totalLevels || me?.totalClues || "?";
  const rank = me?.rank || "?";
  const fragments = teamData?.collectedSecretFragments || [];

  return (
    <div>
      <div className="container">
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}

        {/* Time Is Up Banner / Lockout */}
        {isTimeUp && (
          <div
            className="alert danger animate-fade-in"
            style={{
              padding: "24px 20px",
              textAlign: "center",
              marginBottom: 24,
              border: "2px solid var(--danger)",
              background: "rgba(225, 29, 72, 0.15)",
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>⏰</div>
            <h2 style={{ margin: 0, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              TIME IS UP!
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 15, color: "var(--text)" }}>
              The hunt timer has expired and the event has officially concluded. Game submissions and scans are now locked.
            </p>
          </div>
        )}

        {/* Team Blocked Banner */}
        {teamData?.blocked && (
          <div
            className="alert danger animate-fade-in"
            style={{
              padding: "20px",
              textAlign: "center",
              marginBottom: 24,
              border: "2px solid var(--danger)",
              background: "rgba(225, 29, 72, 0.2)",
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 4 }}>🚫</div>
            <h3 style={{ margin: 0, color: "var(--danger)" }}>TEAM TEMPORARILY BLOCKED</h3>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>
              {teamData.blockReason || "You have been blocked due to multiple consecutive wrong QR code scans."}
            </p>
            {teamData.blockedUntil && (
              <p className="mono" style={{ margin: "6px 0 0", fontWeight: 700, color: "var(--gold)" }}>
                Unblocks at: {new Date(teamData.blockedUntil).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        <div className="spread" style={{ marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: "0 0 4px" }}>🏴‍☠️ {teamData?.teamName} {currentEvent ? `(${currentEvent.name})` : ""}</h2>
            <span className="muted mono" style={{ fontSize: 13 }}>{teamData?.teamId}</span>
          </div>
          <div className="stat-grid" style={{ width: "100%", marginTop: 16 }}>
            <div className="stat">
              <div className="num" style={{ color: "#f5a623" }}>{teamData?.points ?? 0}</div>
              <div className="lbl">💰 Points</div>
            </div>
            <div className="stat">
              <div className="num">{currentLevel}</div>
              <div className="lbl">🌊 Current Level</div>
            </div>
            <div className="stat">
              <div className="num" style={{ color: "var(--ok)" }}>
                {me?.completedCluesCount ?? teamData?.solvedClues?.length ?? 0}
              </div>
              <div className="lbl">✅ Clues Completed</div>
            </div>
            <div className="stat">
              <div className="num" style={{ color: "var(--warn)" }}>
                {me?.remainingCluesCount ?? Math.max(0, (me?.totalAssignedClues || totalLevels || 0) - (teamData?.solvedClues?.length || 0))}
              </div>
              <div className="lbl">⏳ Clues Remaining</div>
            </div>
            <div className="stat">
              <div className="num">
                {me?.totalAssignedClues ?? totalLevels ?? 0}
              </div>
              <div className="lbl">🎯 Total Assigned Clues</div>
            </div>
            <div className="stat">
              <div className="num">#{rank}</div>
              <div className="lbl">🏆 Points Rank</div>
            </div>
            <div className="stat">
              <div className="num">{teamData?.wrongScans ?? 0}</div>
              <div className="lbl">⚓ Wrong QR Scans</div>
            </div>
            <div className="stat">
              <div className="num">{fragments.length}</div>
              <div className="lbl">🧩 Secret Code Fragments</div>
            </div>
            <div className="stat">
              <div className="num">{fmtMs(me?.event?.remainingMs)}</div>
              <div className="lbl">🧭 Timer</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16, background: "var(--bg-2)" }}>
          <div className="spread">
            <div>
              <h3 style={{ margin: 0, color: "var(--gold)" }}>🧩 Treasure Code Pieces</h3>
              <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
                Pieces are unlocked with each correct QR scan. Once complete, submit below or take it to the treasure chest holder!
              </p>
            </div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            {fragments.length > 0 ? (
              (() => {
                // Jumble fragments deterministically based on team ID so order is randomized
                const seedStr = teamData?.teamId || "JUMBLE";
                let hash = 0;
                for (let i = 0; i < seedStr.length; i++) hash = (hash << 5) - hash + seedStr.charCodeAt(i);

                const jumbled = fragments.map((frag, idx) => ({ frag, idx }))
                  .sort((a, b) => {
                    const valA = (a.idx * 31 + Math.abs(hash)) % 17;
                    const valB = (b.idx * 31 + Math.abs(hash)) % 17;
                    return valA - valB;
                  });

                return jumbled.map((item, displayIdx) => (
                  <span key={displayIdx} className="pill ok mono" style={{ fontSize: 16, padding: "6px 12px" }}>
                    Piece #{displayIdx + 1}: {item.frag}
                  </span>
                ));
              })()
            ) : (
              <span className="muted" style={{ fontSize: 13 }}>No code pieces unlocked yet. Scan your first checkpoint QR!</span>
            )}
          </div>

          {fragments.length > 0 && (
            <form onSubmit={submitFinalSecretCode} className="row" style={{ marginTop: 16 }}>
              <input
                placeholder="Enter complete treasure code..."
                value={secretCodeInput}
                onChange={(e) => setSecretCodeInput(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
                disabled={isTimeUp}
                required
              />
              <button className="btn ok" type="submit" disabled={busy || isTimeUp}>
                🔓 Unlock Treasure Chest
              </button>
            </form>
          )}
        </div>

        {isComplete ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48 }}>🏴‍☠️</div>
            <h2>TREASURE FOUND!</h2>
            <p className="muted">
              Final Points: <strong className="mono">{teamData.finalScore}</strong>
            </p>
          </div>
        ) : clue && (clue.clue || clue.description) ? (
          <div className="card">
            <div className="spread">
              <span className="pill info">Level {clue.currentLevel || clue.clueNumber} of {totalLevels}</span>
              <span className="pill ok">🧭 Active Riddle</span>
            </div>

            <div style={{ background: "var(--bg-2)", padding: 20, borderRadius: 8, marginTop: 16 }}>
              <p style={{ fontSize: 18, lineHeight: 1.7, margin: "0 0 16px", color: "var(--text)", fontWeight: 500 }}>
                {clue.clue?.description || clue.description}
              </p>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }} className="spread">
                <span className="muted" style={{ fontSize: 13 }}>Scan the matching QR code at the location described to continue.</span>
                <Link to="/scan" className="btn ok small" style={{ textDecoration: "none" }}>
                  📷 Open Camera Scanner
                </Link>
              </div>
            </div>

            {clue.clue?.hints && clue.clue.hints.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p className="muted" style={{ marginBottom: 8 }}>
                  Stuck? Use a hint (costs points):
                </p>
                <div className="row">
                  {clue.clue.hints.map((h, i) => (
                    <button key={i} className="btn secondary small" onClick={() => useHint(i + 1)} disabled={busy || isTimeUp}>
                      Hint {i + 1} (−{h.penalty} points)
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card muted">No active levels right now. Set sail when the hunt begins.</div>
        )}

        {currentEvent?.rulesAndRegulations && (
          <div className="card" style={{ marginBottom: 16, background: "var(--bg-2)" }}>
            <h3 style={{ color: "var(--gold)", margin: "0 0 8px" }}>📜 Event Rules & Regulations</h3>
            <p style={{ whiteSpace: "pre-wrap", fontSize: 14, margin: 0, color: "var(--text)" }}>
              {currentEvent.rulesAndRegulations}
            </p>
          </div>
        )}

        {sideQuests.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <h3>🎯 Event Side Quests</h3>
            {sideQuests.map((quest) => (
              <SideQuestItem
                key={quest._id}
                quest={quest}
                completed={teamData?.completedSideQuests?.includes(quest._id)}
                questAnswers={questAnswers}
                setQuestAnswers={setQuestAnswers}
                submitSideQuest={submitSideQuest}
                busy={busy || isTimeUp}
              />
            ))}
          </div>
        )}

        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ color: "var(--gold)", margin: "0 0 12px" }}>📜 Detailed Score History</h3>
          {history.length === 0 ? (
            <p className="muted">No score transactions yet, pirate.</p>
          ) : (
            <table className="board" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Action Type</th>
                  <th>Description / Reason</th>
                  <th>Points Delta</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 50).map((h, i) => {
                  const typeKey = h.type || h.kind || "CHECKPOINT";
                  const info = TX_LABELS[typeKey] || { label: typeKey, color: "info" };
                  const pts = h.amount != null ? h.amount : h.points != null ? h.points : 0;
                  const dateVal = h.createdAt || h.at;

                  return (
                    <tr key={i}>
                      <td className="muted mono">{h.level || "—"}</td>
                      <td>
                        <span className={`pill ${info.color}`}>{info.label}</span>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--text)" }}>
                        {h.reason || h.note || "Point adjustment"}
                      </td>
                      <td className="mono" style={{ fontSize: 14, fontWeight: 700, color: pts >= 0 ? "var(--gold)" : "var(--danger)" }}>
                        {pts > 0 ? `+${pts}` : pts}
                      </td>
                      <td className="muted" style={{ fontSize: 12 }}>{fmtDate(dateVal)}</td>
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
