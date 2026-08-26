import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState(location.state?.teamId || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(identifier, password);
      const from = location.state?.from || "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container narrow">
      <p className="brand" style={{ marginTop: 24 }}>
        <Link to="/" style={{ color: "inherit" }}>🏴‍☠️ THE LOST TREASURE</Link>
      </p>

      <div className="hero" style={{ padding: "24px 0" }}>
        <div style={{ fontSize: 48 }}>🧭</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 6vw, 42px)" }}>
          Welcome Back, Treasure Hunter
        </h1>
        <p className="tagline" style={{ margin: "8px 0 0" }}>
          Continue your adventure
        </p>
      </div>

      {error && <div className="alert error">⚓ {error}</div>}

      <form className="card" onSubmit={submit}>
        <div className="field">
          <label>Team Name or ID</label>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
            placeholder="e.g. STRAW-HATS or team name"
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your secret code"
          />
        </div>
        <button className="btn block" type="submit" disabled={busy}>
          {busy ? "🧭 Reading the Timer..." : "⛵ LOGIN"}
        </button>
      </form>

      <p className="muted" style={{ textAlign: "center" }}>
        New team? <Link to="/register">🏴‍☠️ Create your team</Link>
      </p>
    </div>
  );
}
