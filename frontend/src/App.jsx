import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { useAuth } from "./auth.jsx";
import { api } from "./api.js";
import { EventProvider, useEvent } from "./EventContext.jsx";
import Sidebar from "./Sidebar.jsx";
import Home from "./pages/Home.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import Admin from "./pages/Admin.jsx";
import LevelMap from "./pages/GrandLineMap.jsx";
import ScoreHistory from "./pages/BountyHistory.jsx";
import HowToPlay from "./pages/HowToPlay.jsx";

const Scan = lazy(() => import("./pages/Scan.jsx"));

function Lazy({ children }) {
  return <Suspense fallback={<div className="container narrow"><p className="muted" style={{ textAlign: "center", marginTop: 60 }}>Loading the treasure map...</p></div>}>{children}</Suspense>;
}

function RequirePlayer({ children }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function CheckingHuntStatus() {
  return (
    <div className="container narrow">
      <p className="muted" style={{ textAlign: "center", marginTop: 60 }}>Checking hunt status...</p>
    </div>
  );
}

function RequireLiveEvent({ children }) {
  const { isLoggedIn, token, logout } = useAuth();
  const { currentEvent, loading } = useEvent();
  // The gate must use the LOGGED-IN TEAM's own event (from /teams/me), not the
  // ui-wide selected event (localStorage), which may belong to a different event.
  const [teamEvent, setTeamEvent] = useState(null);
  const [resolving, setResolving] = useState(isLoggedIn);

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn || !token) {
      setResolving(false);
      return undefined;
    }
    setResolving(true);
    api
      .get("/teams/me", { token, eventId: null })
      .then((d) => {
        if (!cancelled) setTeamEvent(d.event || null);
      })
      .catch((err) => {
        if (!cancelled) {
          if (err.status === 401) logout();
          else setTeamEvent(null); // fall back to ui-wide event below
        }
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, token, logout]);

  if (loading || resolving) return <CheckingHuntStatus />;

  const base = (isLoggedIn && teamEvent) || currentEvent || null;
  const status = base?.status || "INACTIVE";
  const isLive = !!base && (status === "RUNNING" || status === "ACTIVE");
  const isTimeUp = base?.remainingMs != null && base.remainingMs <= 0;

  if (!isLive || isTimeUp) {
    let reason = `⏸️ The event is currently ${status}. Access to game features is disabled.`;
    if (status === "PAUSED") {
      reason = "⏸️ The event has been PAUSED by the organizer. Access to game features is currently locked.";
    } else if (status === "ENDED" || isTimeUp) {
      reason = "⏰ The hunt timer has expired and the event is finished. Access to game features is locked.";
    } else if (status === "DRAFT" || status === "READY" || status === "NOT_STARTED") {
      reason = "📝 The event has not started yet. Access to game features will unlock when the organizer starts the hunt.";
    }

    return <Navigate to="/" replace state={{ eventNotice: reason }} />;
  }

  return children;
}

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <ErrorBoundary>
      <EventProvider>
        {!isAdmin && <Sidebar />}
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/scan"
          element={
            <RequirePlayer>
              <RequireLiveEvent>
                <Lazy>
                  <Scan />
                </Lazy>
              </RequireLiveEvent>
            </RequirePlayer>
          }
        />
        <Route
          path="/scan/:qrId"
          element={
            <RequirePlayer>
              <RequireLiveEvent>
                <Lazy>
                  <Scan />
                </Lazy>
              </RequireLiveEvent>
            </RequirePlayer>
          }
        />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/map" element={
          <RequirePlayer><RequireLiveEvent><LevelMap /></RequireLiveEvent></RequirePlayer>
        } />
        <Route path="/bounty-history" element={
          <RequirePlayer><RequireLiveEvent><ScoreHistory /></RequireLiveEvent></RequirePlayer>
        } />
        <Route
          path="/dashboard"
          element={
            <RequirePlayer>
              <RequireLiveEvent>
                <Dashboard />
              </RequireLiveEvent>
            </RequirePlayer>
          }
        />
        <Route path="/how-to-play" element={<HowToPlay />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </EventProvider>
    </ErrorBoundary>
  );
}
