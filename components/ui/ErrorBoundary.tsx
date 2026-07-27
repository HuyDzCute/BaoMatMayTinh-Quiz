"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { logger } from "@/lib/logger";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("[ErrorBoundary]", error, info);
    // TODO: gửi lên Sentry / logging service
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 480,
              padding: 28,
              borderRadius: 16,
              background: "var(--card-bg, #ffffff)",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#fee2e2,#fecaca)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <AlertTriangle size={28} color="#dc2626" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Đã xảy ra lỗi</h2>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 18, lineHeight: 1.5 }}>
              Ứng dụng gặp sự cố. Bạn có thể thử lại hoặc quay về trang chủ.
            </p>
            <pre
              style={{
                fontSize: 11,
                color: "#94a3b8",
                background: "#f8fafc",
                padding: 10,
                borderRadius: 8,
                overflow: "auto",
                maxHeight: 100,
                marginBottom: 18,
                textAlign: "left",
              }}
            >
              {this.state.error.message}
            </pre>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.1)",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13.5,
                }}
              >
                <RefreshCcw size={14} /> Thử lại
              </button>
              <button
                type="button"
                onClick={this.handleHome}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg,#3b82f6,#6366f1)",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13.5,
                }}
              >
                <Home size={14} /> Trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
