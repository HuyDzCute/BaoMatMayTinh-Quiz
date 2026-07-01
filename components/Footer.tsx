"use client";
import { Sparkles, Network, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <>
      <div className="footer-wrapper">
        {/* Animated gradient top border */}
        <div className="footer-border" />

        <footer className="footer-bg">
          <div className="footer-inner">

            {/* ── Top row: brand tag + azota ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Brand */}
              <div className="footer-brand-tag">
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: "rgba(59,130,246,0.12)",
                    border: "1px solid rgba(59,130,246,0.25)",
                    flexShrink: 0,
                  }}
                >
                  <Network
                    size={10}
                    style={{ color: "#60a5fa" }}
                  />
                </span>
                <span>Quản Trị Hệ Thống Mạng</span>
              </div>

              {/* Azota */}
              <a
                href="https://azota.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-azota"
                aria-label="Azota"
              >
                <ExternalLink size={10} />
                Azota (Thùy Dương làm)
              </a>
            </div>

            {/* ── Divider ── */}
            <div className="footer-divider" />

            {/* ── Tagline (centered, full width) ── */}
            <div className="footer-tagline">
              <Sparkles
                size={11}
                className="footer-tagline-spark footer-tagline-spark-left"
                aria-hidden="true"
              />
              <span className="footer-tagline-text">
                Học hành hăng say &nbsp;·&nbsp; Vận may sẽ đến
              </span>
              <Sparkles
                size={11}
                className="footer-tagline-spark footer-tagline-spark-right"
                aria-hidden="true"
              />
            </div>

            {/* ── Bottom row: copyright + social icons ── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4" style={{ marginTop: "1rem" }}>

              {/* Copyright */}
              <p className="footer-copyright">
                © 2026 — All rights reserved
              </p>

              {/* Social icons — glass card */}
              <div className="social-card">
                {/* TikTok — official brand SVG */}
                <a
                  href="https://www.tiktok.com/@.duck23huy"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="social-icon-wrap tt"
                >
                  <span className="shimmer-sweep" aria-hidden="true" />
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.34a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.27z"/>
                  </svg>
                </a>

                {/* Instagram — official brand SVG */}
                <a
                  href="https://www.instagram.com/puin_2301/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="social-icon-wrap ig"
                >
                  <span className="shimmer-sweep" aria-hidden="true" />
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    style={{ stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" }}
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
              </div>
            </div>

          </div>
        </footer>
      </div>
    </>
  );
}