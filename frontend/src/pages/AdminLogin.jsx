import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, saveAdmin } from "../api.js";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api.post("/admin/auth/login", { email, password });
      saveAdmin({ token: data.token, admin: data.admin });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container narrow">
      <p className="brand" style={{ marginTop: 24 }}>
        <Link to="/" style={{ color: "inherit" }}>
          🏴‍☠️ THE LOST TREASURE
        </Link>
      </p>

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⚓</div>
        <h1 style={{ fontFamily: "var(--font-display)", color: "var(--gold)", margin: 0 }}>
          Admin Panel
        </h1>
        <p className="muted" style={{ fontFamily: "var(--font-parchment)", fontStyle: "italic", fontSize: 16 }}>
          Authorized personnel only
        </p>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form className="card" onSubmit={submit}>
        <div className="field">
          <label>📧 Admin Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            placeholder="admin@treasurehunt.com"
          />
        </div>
        <div className="field">
          <label>🔒 Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your access code"
          />
        </div>
        <button className="btn block" type="submit" disabled={busy}>
          {busy ? "⚓ Entering..." : "⚓ ENTER ADMIN PANEL"}
        </button>
      </form>

      <p className="muted" style={{ textAlign: "center" }}>
        <Link to="/">← Back to THE LOST TREASURE</Link>
      </p>
    </div>
  );
}
