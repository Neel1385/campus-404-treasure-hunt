import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import Home from "./pages/Home.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import Admin from "./pages/Admin.jsx";
import GrandLineMap from "./pages/GrandLineMap.jsx";
import BountyHistory from "./pages/BountyHistory.jsx";

// Lazy-loaded: html5-qrcode is heavy, so the camera scanner bundle is only
// downloaded when a player actually opens the scan page.
const Scan = lazy(() => import("./pages/Scan.jsx"));

function Lazy({ children }) {
  return <Suspense fallback={<div className="container narrow"><p className="muted" style={{ textAlign: "center", marginTop: 40 }}>Loading…</p></div>}>{children}</Suspense>;
}

function RequirePlayer({ children }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/scan"
        element={
          <RequirePlayer>
            <Lazy>
              <Scan />
            </Lazy>
          </RequirePlayer>
        }
      />
      <Route
        path="/scan/:qrId"
        element={
          <RequirePlayer>
            <Lazy>
              <Scan />
            </Lazy>
          </RequirePlayer>
        }
      />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/map" element={
        <RequirePlayer><GrandLineMap /></RequirePlayer>
      } />
      <Route path="/bounty-history" element={
        <RequirePlayer><BountyHistory /></RequirePlayer>
      } />
      <Route
        path="/dashboard"
        element={
          <RequirePlayer>
            <Dashboard />
          </RequirePlayer>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
