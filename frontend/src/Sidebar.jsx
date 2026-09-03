import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth.jsx";

export default function Sidebar() {
  const { isLoggedIn, team, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleLogout = useCallback(() => {
    setOpen(false);
    logout();
    navigate("/", { replace: true });
  }, [logout, navigate]);

  const playerNav = [
    { to: "/scan", icon: "📷", label: "Scan QR Code" },
    { to: "/map", icon: "🗺️", label: "Level Map" },
    { to: "/bounty-history", icon: "📜", label: "Score History" },
  ];

  const guestNav = [
    { to: "/how-to-play", icon: "📖", label: "How to Play" },
  ];

  const navItems = isLoggedIn ? playerNav : guestNav;

  return (
    <>
      {/* Hamburger Button — fixed top-left */}
      <button
        ref={btnRef}
        className={`pirate-menu-btn ${open ? "open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Open navigation menu"
        aria-expanded={open}
      >
        <span className="bar" />
        <span className="bar" />
        <span className="bar" />
      </button>

      {/* Overlay */}
      {open && <div className="pirate-overlay" onClick={() => setOpen(false)} />}

      {/* Sidebar Panel */}
      <aside
        ref={panelRef}
        className={`pirate-sidebar ${open ? "open" : ""}`}
        role="navigation"
      >
        {/* Close button */}
        <button className="pirate-sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">
          ✕
        </button>

        {/* Header */}
        <div className="pirate-sidebar-header">
          <div className="pirate-sidebar-brand">🏴‍☠️ CAMPUS 404</div>
          {isLoggedIn && team && (
            <div className="pirate-sidebar-player">
              <div className="pirate-sidebar-player-name">{team.teamName}</div>
              <div className="pirate-sidebar-player-stats">
                <span>Level {team.currentLevel || team.currentClue || 1}</span>
                <span className="pirate-sidebar-divider">·</span>
                <span>{team.points || 0} pts</span>
              </div>
            </div>
          )}
          {!isLoggedIn && (
            <div className="pirate-sidebar-player">
              <div className="pirate-sidebar-player-name muted" style={{ fontSize: 13 }}>
                Start your adventure
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="pirate-sidebar-divider-line" />

        {/* Navigation Links */}
        <nav className="pirate-sidebar-nav">
          <Link
            to="/"
            className={`pirate-sidebar-link ${location.pathname === "/" ? "active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <span className="pirate-sidebar-link-icon">🏠</span>
            <span className="pirate-sidebar-link-label">Home</span>
          </Link>

          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`pirate-sidebar-link ${location.pathname === item.to ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="pirate-sidebar-link-icon">{item.icon}</span>
              <span className="pirate-sidebar-link-label">{item.label}</span>
            </Link>
          ))}

          <Link
            to="/how-to-play"
            className={`pirate-sidebar-link ${location.pathname === "/how-to-play" ? "active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <span className="pirate-sidebar-link-icon">📖</span>
            <span className="pirate-sidebar-link-label">How to Play</span>
          </Link>
        </nav>

        {/* Divider */}
        <div className="pirate-sidebar-divider-line" />

        {/* Bottom section */}
        <div className="pirate-sidebar-bottom">
          {isLoggedIn ? (
            <>
              <Link to="/admin/login" className="pirate-sidebar-link" onClick={() => setOpen(false)}>
                <span className="pirate-sidebar-link-icon">👑</span>
                <span className="pirate-sidebar-link-label">Organizer / Admin</span>
              </Link>
              <button className="pirate-sidebar-link pirate-sidebar-logout" onClick={handleLogout}>
                <span className="pirate-sidebar-link-icon">🚪</span>
                <span className="pirate-sidebar-link-label">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="pirate-sidebar-link" onClick={() => setOpen(false)}>
                <span className="pirate-sidebar-link-icon">🧭</span>
                <span className="pirate-sidebar-link-label">Login</span>
              </Link>
              <Link to="/register" className="pirate-sidebar-link" onClick={() => setOpen(false)}>
                <span className="pirate-sidebar-link-icon">🏴‍☠️</span>
                <span className="pirate-sidebar-link-label">Register Team</span>
              </Link>
              <Link to="/admin/login" className="pirate-sidebar-link" onClick={() => setOpen(false)}>
                <span className="pirate-sidebar-link-icon">👑</span>
                <span className="pirate-sidebar-link-label">Organizer / Admin</span>
              </Link>
            </>
          )}
        </div>

        {/* Footer decoration */}
        <div className="pirate-sidebar-footer">
          <span className="pirate-sidebar-footer-text">Find the treasure. Solve the clues.</span>
        </div>
      </aside>
    </>
  );
}
