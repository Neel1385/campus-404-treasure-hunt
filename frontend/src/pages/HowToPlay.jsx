import { Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const STEPS = [
  { icon: "🏴‍☠️", title: "REGISTER", desc: "Create your team and pick a name" },
  { icon: "1️⃣", title: "START", desc: "Begin from Level 1" },
  { icon: "🔍", title: "FIND", desc: "Locate the QR Code for your level" },
  { icon: "📱", title: "SCAN", desc: "Scan the QR Code with your phone" },
  { icon: "📜", title: "READ", desc: "Read the clue that is displayed" },
  { icon: "👣", title: "FOLLOW", desc: "Follow the clue to find the next QR Code" },
  { icon: "💰", title: "EARN", desc: "Earn points for correct scans and answers" },
  { icon: "✅", title: "COMPLETE", desc: "Complete each level in order" },
  { icon: "🏆", title: "REACH", desc: "Reach the Final Treasure to win!" },
];

const RULES = [
  "Scanning the correct QR Code earns you points",
  "Scanning the wrong QR Code deducts points",
  "Complete each level before moving to the next",
  "Use hints if you're stuck (costs points)",
  "The fastest team with the most points wins!",
];

const TIPS = [
  { icon: "📱", title: "Steady Hands", tip: "Hold your phone steady and ensure good lighting when scanning QR Codes for a quick read." },
  { icon: "⚡", title: "Speed Matters", tip: "Answer quickly — teams that solve clues faster earn Speed Bonuses on top of base points." },
  { icon: "💡", title: "Use Hints Wisely", tip: "Hints cost points, so try solving on your own first. But don't waste too much time — speed is valuable!" },
  { icon: "🔎", title: "Read Carefully", tip: "Each clue contains the location of the next QR Code. Read every word — wrong scans cost you points!" },
];

export default function HowToPlay() {
  const { team } = useAuth();

  return (
    <div>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🗺️</div>
          <h1 style={{ fontFamily: "var(--font-display)", color: "var(--gold)", margin: 0 }}>
            HOW TO PLAY
          </h1>
          <p className="muted" style={{ fontFamily: "var(--font-parchment)", fontStyle: "italic", fontSize: 16 }}>
            Everything you need to know to start your treasure hunt
          </p>
        </div>

        {/* Step-by-step flow */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", marginTop: 0 }}>
            📜 The Hunt Flow
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {STEPS.map((step, i) => (
              <div key={i}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 16px",
                    background: "rgba(13,15,20,0.4)",
                    borderRadius: 8,
                    border: "1px solid rgba(212,168,67,0.08)",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "rgba(212,168,67,0.12)",
                      border: "1px solid rgba(212,168,67,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {step.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Step {i + 1}: {step.title}
                    </div>
                    <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ textAlign: "center", color: "rgba(212,168,67,0.3)", fontSize: 16, lineHeight: "20px" }}>
                    ↓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rules */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", marginTop: 0 }}>
            ⚖️ Rules
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {RULES.map((rule, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: "rgba(13,15,20,0.4)",
                  borderRadius: 8,
                  border: "1px solid rgba(212,168,67,0.08)",
                }}
              >
                <span style={{ fontSize: 16, color: "var(--gold)" }}>☠️</span>
                <span style={{ fontSize: 14 }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", marginTop: 0 }}>
            💡 Tips & Tricks
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {TIPS.map((t, i) => (
              <div
                key={i}
                style={{
                  padding: 16,
                  background: "rgba(13,15,20,0.4)",
                  borderRadius: 8,
                  border: "1px solid rgba(212,168,67,0.08)",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
                <div style={{ fontFamily: "var(--font-heading)", color: "var(--gold)", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  {t.title}
                </div>
                <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{t.tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 16, marginBottom: 24 }}>
          {team ? (
            <Link to="/scan" className="btn">🗺️ START HUNT</Link>
          ) : (
            <Link to="/register" className="btn">🏴‍☠️ REGISTER TEAM</Link>
          )}
          <Link to="/leaderboard" className="btn secondary">💰 VIEW LEADERBOARD</Link>
          <Link to={team ? "/dashboard" : "/"} className="btn ghost">← BACK TO DASHBOARD</Link>
        </div>
      </div>
    </div>
  );
}
