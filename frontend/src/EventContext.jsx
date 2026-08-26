import { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";

const EventContext = createContext();

export function EventProvider({ children }) {
  const [currentEvent, setCurrentEvent] = useState(null);
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
  };

  const selectEvent = (event) => {
    setCurrentEvent(event);
    if (event && event.theme) {
      applyTheme(event.theme);
    }
  };

  const loadEvents = async () => {
    try {
      const res = await api.get("/events");
      if (res.success && res.data.length > 0) {
        setEventsList(res.data);
        if (!currentEvent) {
          selectEvent(res.data[0]);
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
