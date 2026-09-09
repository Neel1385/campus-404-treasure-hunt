import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container narrow" style={{ paddingTop: 60, textAlign: "center" }}>
          <div className="card" style={{ padding: 40, border: "2px solid var(--danger, #ef4444)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚓</div>
            <h2 style={{ color: "var(--gold, #f59e0b)", margin: "0 0 8px" }}>Rough Seas Ahead!</h2>
            <p className="muted" style={{ fontSize: 15, marginBottom: 20 }}>
              An unexpected UI error occurred while navigating the map.
            </p>
            <div className="alert error" style={{ fontSize: 13, textAlign: "left", wordBreak: "break-word" }}>
              {this.state.error?.message || "Unknown rendering exception"}
            </div>
            <button
              className="btn block"
              style={{ marginTop: 16 }}
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              ⛵ Reload Adventure
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
