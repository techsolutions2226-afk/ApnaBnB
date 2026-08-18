import { Component } from "react";
import { useLocation } from "react-router-dom";

/**
 * ErrorBoundary — catches render crashes in the tree below it so a single
 * broken page never unmounts the whole app (the cause of the "white screen"
 * that used to be fixable only by a hard refresh).
 *
 * The boundary shows a fallback with a "Try again" (re-mount) and "Reload"
 * button. When used via RouteErrorBoundary it is keyed by pathname, so simply
 * navigating away clears the error and the app recovers automatically.
 */
class ErrorBoundaryClass extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught a render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            textAlign: "center",
            fontFamily: "inherit",
          }}
          role="alert"
        >
          <div style={{ fontSize: 40 }}>😕</div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#222" }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, maxWidth: 420, color: "#717171", fontSize: 14 }}>
            This page hit an unexpected error. It is safe to retry — your data is
            not lost.
          </p>
          {this.state.error?.message && (
            <p
              style={{
                margin: 0,
                maxWidth: 480,
                fontSize: 12,
                color: "#999",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </p>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: "10px 18px",
                border: "none",
                borderRadius: 8,
                background: "#134e2c",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 18px",
                border: "1px solid #ccc",
                borderRadius: 8,
                background: "#fff",
                color: "#222",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Router-aware wrapper: remounts the boundary on every path change, so an
 * error on one route clears as soon as the user navigates (no refresh needed).
 */
export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return (
    <ErrorBoundaryClass key={location.pathname}>{children}</ErrorBoundaryClass>
  );
}
