import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: string; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: "" };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error: error?.message || "Unknown error" };
  }

  componentDidCatch(error: any, info: any) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  private recover = () => this.setState({ hasError: false, error: "" });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#0f1117", color: "#fff", flexDirection: "column", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24, maxWidth: 320 }}>{this.state.error}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={this.recover} style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "11px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Try Again</button>
            <button onClick={() => { this.recover(); window.location.href = "/"; }} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Go Home</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
