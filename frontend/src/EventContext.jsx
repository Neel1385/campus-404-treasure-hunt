import { createContext, useContext, useState, useEffect } from "react";
import { api, EVENT_KEY } from "./api.js";

const EventContext = createContext();

export function EventProvider({ children }) {
  const [currentEvent, setCurrentEvent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(EVENT_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const applyTheme = (theme) => {
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty("--event-primary", theme.primaryColor || "#10b981");
    root.style.setProperty("--event-secondary", theme.secondaryColor || "#065f46");
    root.style.setProperty("--event-accent", theme.accentColor || "#f59e0b");
    root.style.setProperty("--event-background", theme.backgroundColor || "#0f172a");
    root.style.setProperty("--event-text", theme.textColor || "#f8fafc");

    if (theme.backgroundColor) root.style.setProperty("--bg", theme.backgroundColor);
    if (theme.accentColor) root.style.setProperty("--gold", theme.accentColor);
  };

  const selectEvent = (event) => {
    setCurrentEvent(event);
    if (event) {
      localStorage.setItem(EVENT_KEY, JSON.stringify(event));
      if (event.theme) applyTheme(event.theme);
    } else {
      localStorage.removeItem(EVENT_KEY);
    }
  };

  const loadEvents = async () => {
    try {
      const res = await api.get("/events");
      const list = Array.isArray(res) ? res : res.data || [];
      if (list.length > 0) {
        setEventsList(list);
        if (!currentEvent) {
          selectEvent(list[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <EventContext.Provider value={{ currentEvent, eventsList, selectEvent, loadEvents, loading }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  return useContext(EventContext);
}
