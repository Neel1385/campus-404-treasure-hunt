import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, readPlayer, savePlayer, clearPlayer, PLAYER_KEY } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readPlayer());

  // On initial mount, refresh the stored token against the server (silently).
  useEffect(() => {
    const stored = readPlayer();
    if (!stored?.token) return;
    api
      .get("/auth/me", { token: stored.token })
      .then((data) => setAuth({ token: stored.token, team: data.team }))
      .catch(() => {
        clearPlayer();
        setAuth(null);
      });
  }, []);

  const login = useCallback(async (identifier, password) => {
    const data = await api.post("/auth/login", { identifier, password });
    const next = { token: data.token, team: data.team };
    savePlayer(next);
    setAuth(next);
    return data.team;
  }, []);

  const logout = useCallback(() => {
    clearPlayer();
    setAuth(null);
  }, []);

  const value = {
    auth,
    isLoggedIn: !!auth?.token,
    token: auth?.token,
    team: auth?.team,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export { PLAYER_KEY };
