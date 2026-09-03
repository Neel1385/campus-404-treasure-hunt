import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useEvent } from "../EventContext.jsx";

function extractQrId(text) {
  const raw = String(text || "").trim();
  if (/^https?:\/\//i.test(raw)) {
    try {
      const m = new URL(raw).pathname.match(/\/scan\/([A-Za-z0-9]+)/i);
      if (m) return m[1].toUpperCase();
    } catch { /* fall through */ }
    return null;
  }
  const t = raw.toUpperCase();
  return /^[A-Z0-9]{6,12}$/.test(t) ? t : null;
}

export default function Scan() {
  const { qrId } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, team: authTeam, token, logout } = useAuth();
  const { currentEvent } = useEvent();

  const [manual, setManual] = useState(qrId || "");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [camMode, setCamMode] = useState(false);
  const [camError, setCamError] = useState("");
  const [showWarning, setShowWarning] = useState(true);
  const [teamData, setTeamData] = useState(null);

  const scannerRef = useRef(null);
  const stoppedRef = useRef(false);
  const runScanRef = useRef(null);

  useEffect(() => {
    if (isLoggedIn && token) {
      const param = currentEvent?._id ? `?eventId=${currentEvent._id}` : "";
      api.get(`/teams/me${param}`, { token }).then((d) => setTeamData(d.team)).catch(() => {});
    }
  }, [isLoggedIn, token, currentEvent]);

  const runScan = async (id) => {
    if (!isLoggedIn) {
      navigate("/login", { replace: true, state: { from: `/scan/${id}` } });
      return;
    }
    setError("");
    setResult(null);
    setShowWarning(false);
    setBusy(true);
    try {
      const payload = { qrId: id };
      if (currentEvent?._id) payload.eventId = currentEvent._id;
      const data = await api.post("/game/scan", payload, { token });
      setResult(data);
    } catch (err) {
      if (err.status === 401) {
        logout();
        navigate("/login", { replace: true, state: { from: `/scan/${id}` } });
        return;
      }
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  runScanRef.current = runScan;

  useEffect(() => {
    if (qrId) runScan(qrId);
  }, [qrId]);

  const stopCamera = async () => {
    if (scannerRef.current && !stoppedRef.current) {
      stoppedRef.current = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      try { await scanner.stop(); } catch { /* already stopped */ }
      try { scanner.clear(); } catch { /* no-op */ }
    }
    setCamMode(false);
  };

  const startCamera = async () => {
    setError("");
    setCamError("");
    setResult(null);
    setBusy(false);
    setShowWarning(false);
    setCamMode(true);
    stoppedRef.current = false;

    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) throw new Error("No camera found on this device.");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          const code = extractQrId(decodedText);
          await stopCamera();
          if (code) runScanRef.current(code);
          else setError("That QR is not a game code. Try another.");
        },
        () => {}
      );
    } catch (err) {
      setCamMode(false);
      setCamError(err.message || "Could not start the camera. Allow camera access and try again.");
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => (scannerRef.current = null));
      }
    };
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const id = manual.trim().toUpperCase();
    if (id) runScan(id);
  };

  const currentLevel = teamData?.currentLevel || teamData?.currentClue || 1;
  const currentPoints = teamData?.points ?? 0;

  return (
    <div className="container narrow">
      <h1 style={{ marginTop: 56 }}>🗿 Scan QR Code {currentEvent ? `(${currentEvent.name})` : ""}</h1>

      {busy && !result && (
        <div className="scan-hero">
          <h2>🗿 Scanning QR Code...</h2>
        </div>
      )}

      {showWarning && !result && !error && !busy && (
        <div className="scan-hero">
          <div className="icon">⚓</div>
          <h2 style={{ color: "var(--warn)" }}>TIMER WARNING</h2>
          <p>You must scan the QR Code for your <strong>current level</strong>.</p>
          <p style={{ color: "var(--danger)" }}>Scanning a wrong QR Code will result in a penalty.</p>
          <div className="stat-grid" style={{ maxWidth: 320, margin: "16px auto" }}>
            <div className="stat">
              <div className="num">{currentLevel}</div>
              <div className="lbl">Current Level</div>
            </div>
            <div className="stat">
              <div className="num">{currentPoints}</div>
              <div className="lbl">Current Points</div>
            </div>
          </div>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => setShowWarning(false)}>
            Start Scanning
          </button>
        </div>
      )}

      {!showWarning && !result && !busy && (
        <div className="row" style={{ justifyContent: "center", marginBottom: 16 }}>
          <button className={`btn ${camMode ? "secondary" : ""}`} onClick={camMode ? stopCamera : startCamera} disabled={busy}>
            {camMode ? "■ Stop camera" : "🗿 Scan QR Code"}
          </button>
          <button className={`btn ${!camMode ? "secondary" : ""}`} onClick={stopCamera}>
            ⌨️ Enter Code
          </button>
        </div>
      )}

      {camError && <div className="alert error">{camError}</div>}
      {error && <div className="alert error">{error}</div>}

      {!result && !showWarning && camMode && !busy && (
        <div className="scan-hero">
          <div className="qr-reader" id="qr-reader" />
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            Point your camera at a QR Code...
          </p>
        </div>
      )}

      {!result && !showWarning && !camMode && !busy && (
        <div className="scan-hero">
          <div className="icon">⌨️</div>
          <h2>Enter the QR Code manually</h2>
          <p className="muted">Scanned by another app? Paste the code shown below the QR.</p>
          <form onSubmit={submit} className="row" style={{ justifyContent: "center", marginTop: 12 }}>
            <input
              style={{ maxWidth: 220, textTransform: "uppercase" }}
              placeholder="e.g. 036B66020574"
              value={manual}
              onChange={(e) => setManual(e.target.value.toUpperCase())}
            />
            <button className="btn" type="submit" disabled={busy}>Check</button>
          </form>
        </div>
      )}

      {result && (
        <div className="scan-hero">
          {result.correct && !result.bonus && !result.trap && !result.hintQR && !result.checkpoint && (
            <>
              <div className="icon">🗿</div>
              <h2 style={{ color: "var(--accent)" }}>CORRECT QR CODE!</h2>
              <p>Great job! You found the correct clue.</p>
              <div className="stat-grid" style={{ maxWidth: 320, margin: "12px auto" }}>
                <div className="stat">
                  <div className="num">{result.currentLevel || "?"}</div>
                  <div className="lbl">Level</div>
                </div>
                <div className="stat">
                  <div className="num" style={{ color: "var(--accent)" }}>+{result.pointsEarned ?? 0}</div>
                  <div className="lbl">Points Earned</div>
                </div>
                <div className="stat">
                  <div className="num">{result.totalPoints ?? "?"}</div>
                  <div className="lbl">Total Points</div>
                </div>
              </div>
              {result.clue && (
                <div className="card" style={{ textAlign: "left", background: "var(--bg-2)" }}>
                  <span className="pill info">🗿 Clue {result.clue.clueNumber}</span>
                  <h3 style={{ margin: "8px 0 4px" }}>{result.clue.title}</h3>
                  <p className="muted" style={{ margin: "0 0 6px" }}>
                    {result.clue.checkpointName} · {result.clue.points} pts
                  </p>
                  <p style={{ margin: 0 }}>{result.clue.description}</p>
                </div>
              )}
              <Link to="/dashboard" className="btn" style={{ marginTop: 8 }}>Read the Clue</Link>
            </>
          )}

          {result.bonus && (
            <>
              <div className="icon">🍎</div>
              <h2 style={{ color: "var(--accent)" }}>BONUS QR CODE!</h2>
              <p>{result.message}</p>
              <p className="muted mono">Points: {result.totalPoints}</p>
              <Link to="/dashboard" className="btn" style={{ marginTop: 8 }}>Back to Dashboard</Link>
            </>
          )}

          {result.trap && (
            <>
              <div className="icon">⚓</div>
              <h2 style={{ color: "var(--danger)" }}>WRONG QR CODE!</h2>
              <p>This QR Code belongs to another level.</p>
              <p className="muted mono">Points: {result.totalPoints}</p>
              <Link to="/dashboard" className="btn" style={{ marginTop: 8 }}>Back to Dashboard</Link>
            </>
          )}

          {result.hintQR && (
            <>
              <div className="icon">💡</div>
              <h2>HINT UNLOCKED</h2>
              <p>{result.hint}</p>
              <Link to="/dashboard" className="btn" style={{ marginTop: 8 }}>Back to Dashboard</Link>
            </>
          )}

          {result.checkpoint && (
            <>
              <div className="icon">📍</div>
              <h2 style={{ color: "var(--accent)" }}>Level Checkpoint Confirmed</h2>
              <p>{result.message}</p>
              <Link to="/dashboard" className="btn" style={{ marginTop: 8 }}>Back to Dashboard</Link>
            </>
          )}

          {!result.correct && !result.bonus && !result.trap && !result.hintQR && !result.checkpoint && !result.already && (
            <>
              <div className="icon">⚓</div>
              <h2 style={{ color: "var(--danger)" }}>WRONG QR CODE!</h2>
              <p>This QR Code is not for your current level.</p>
              <div className="stat-grid" style={{ maxWidth: 320, margin: "12px auto" }}>
                {result.pointsLost != null && result.pointsLost > 0 && (
                  <div className="stat" style={{ borderColor: "rgba(255,77,109,0.4)" }}>
                    <div className="num" style={{ color: "var(--danger)" }}>-{result.pointsLost}</div>
                    <div className="lbl">Penalty</div>
                  </div>
                )}
                {result.previousScore != null && (
                  <div className="stat">
                    <div className="num">{result.previousScore}</div>
                    <div className="lbl">Previous Points</div>
                  </div>
                )}
                <div className="stat">
                  <div className="num">{result.totalPoints ?? "?"}</div>
                  <div className="lbl">Current Points</div>
                </div>
                <div className="stat">
                  <div className="num">{result.currentLevel || "?"}</div>
                  <div className="lbl">Current Level</div>
                </div>
              </div>
              <div className="row" style={{ justifyContent: "center", marginTop: 8 }}>
                <Link to="/dashboard" className="btn secondary">Back to Dashboard</Link>
                <button className="btn" onClick={() => { setResult(null); setManual(""); setShowWarning(true); }}>
                  Scan Again
                </button>
              </div>
            </>
          )}

          {result.already && (
            <>
              <div className="icon">🗿</div>
              <h2>Already Scanned</h2>
              <p>{result.message}</p>
              <Link to="/dashboard" className="btn" style={{ marginTop: 8 }}>Back to Dashboard</Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
