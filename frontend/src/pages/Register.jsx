import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useEvent } from "../EventContext.jsx";

const EMPTY_MEMBER = { fullName: "", collegeId: "" };

export default function Register() {
  const navigate = useNavigate();
  const { currentEvent, eventsList } = useEvent();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [form, setForm] = useState({
    teamName: "",
    leaderName: "",
    leaderCollegeId: "",
    leaderPhone: "",
    password: "",
    confirmPassword: "",
    members: [EMPTY_MEMBER, EMPTY_MEMBER, EMPTY_MEMBER],
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (currentEvent && currentEvent._id) {
      setSelectedEventId(currentEvent._id);
    } else if (eventsList.length > 0) {
      setSelectedEventId(eventsList[0]._id);
    }
  }, [currentEvent, eventsList]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const setMember = (i, key) => (e) => {
    const members = form.members.map((m, idx) => (idx === i ? { ...m, [key]: e.target.value } : m));
    setForm({ ...form, members });
  };

  const addMember = () => {
    if (form.members.length >= 4) {
      setError("Maximum 4 members per team (leader + 3).");
      return;
    }
    setForm({ ...form, members: [...form.members, EMPTY_MEMBER] });
  };

  const removeMember = (i) => {
    if (form.members.length <= 3) return;
    setForm({ ...form, members: form.members.filter((_, idx) => idx !== i) });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (form.password !== form.confirmPassword) throw new Error("Passwords do not match.");
      const data = await api.post("/auth/register", {
        eventId: selectedEventId,
        teamName: form.teamName,
        leaderName: form.leaderName,
        leaderCollegeId: form.leaderCollegeId,
        leaderPhone: form.leaderPhone,
        password: form.password,
        confirmPassword: form.confirmPassword,
        members: form.members.filter((m) => m.fullName || m.collegeId),
      });
      alert(`🏴‍☠️ TEAM "${data.teamName}" CREATED!\nYour Team ID is ${data.teamId}. Keep it safe!`);
      navigate("/login", { state: { teamId: data.teamId } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container narrow">
      <p className="brand" style={{ marginTop: 24 }}>
        <Link to="/" style={{ color: "inherit" }}>🏴‍☠️ CAMPUS 404</Link>
      </p>

      <div className="hero" style={{ padding: "24px 0 16px" }}>
        <div style={{ fontSize: 48 }}>🏴‍☠️</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 5vw, 36px)" }}>
          Create Your Team
        </h1>
        <p className="tagline" style={{ margin: "8px 0 0", fontSize: 16 }}>
          Assemble your team and start the treasure hunt
        </p>
      </div>

      {error && <div className="alert error">⚓ {error}</div>}

      <form className="card" onSubmit={submit}>
        {eventsList.length > 0 && (
          <div className="field">
            <label>⚓ Select Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 6 }}
              required
            >
              {eventsList.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label>🏴‍☠️ Team Name</label>
          <input value={form.teamName} onChange={set("teamName")} required minLength={2} placeholder="e.g. Straw Hats" />
        </div>

        <h3 style={{ marginBottom: 12, fontFamily: "var(--font-heading)", color: "var(--gold)" }}>
          ⚓ Team Leader
        </h3>
        <div className="field">
          <label>Leader Name</label>
          <input value={form.leaderName} onChange={set("leaderName")} required placeholder="Your full name" />
        </div>
        <div className="field">
          <label>College ID</label>
          <input value={form.leaderCollegeId} onChange={set("leaderCollegeId")} required placeholder="Your college ID" />
        </div>
        <div className="field">
          <label>Phone Number</label>
          <input value={form.leaderPhone} onChange={set("leaderPhone")} required placeholder="Contact number" />
        </div>

        <h3 style={{ marginBottom: 12, fontFamily: "var(--font-heading)", color: "var(--gold)" }}>
          👥 Team Members
        </h3>
        {form.members.map((m, i) => (
          <div key={i} className="card" style={{ padding: 12, background: "rgba(13,15,20,0.6)" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong className="muted" style={{ fontFamily: "var(--font-heading)" }}>Member {i + 1}</strong>
              {form.members.length > 3 && (
                <button type="button" className="btn small danger" onClick={() => removeMember(i)}>Remove</button>
              )}
            </div>
            <div className="field" style={{ marginTop: 8 }}>
              <label>Full Name</label>
              <input value={m.fullName} onChange={setMember(i, "fullName")} required />
            </div>
            <div className="field">
              <label>College ID</label>
              <input value={m.collegeId} onChange={setMember(i, "collegeId")} required />
            </div>
          </div>
        ))}
        {form.members.length < 4 && (
          <button type="button" className="btn secondary small" onClick={addMember}>
            + Add Team Member
          </button>
        )}

        <div className="field" style={{ marginTop: 16 }}>
          <label>Secret Code (min 6 characters)</label>
          <input type="password" value={form.password} onChange={set("password")} required minLength={6} />
        </div>
        <div className="field">
          <label>Confirm Secret Code</label>
          <input type="password" value={form.confirmPassword} onChange={set("confirmPassword")} required minLength={6} />
        </div>

        <button className="btn block" type="submit" disabled={busy}>
          {busy ? "🗿 Creating your team..." : "🏴‍☠️ CREATE TEAM & START HUNT"}
        </button>
      </form>

      <p className="muted" style={{ textAlign: "center" }}>
        Already have a team? <Link to="/login">🧭 Login</Link>
      </p>
    </div>
  );
}
