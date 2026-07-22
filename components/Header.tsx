"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Trophy, Menu, X, LogIn, LogOut, Sun, Moon, BookOpen, Layers, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { getPlayerName } from "@/lib/storage";
import { useSoundEnabled, playSfx } from "@/lib/sound";
import FlashcardDueIndicator from "@/components/FlashcardDueIndicator";

const navLinks = (user: { isAnonymous: boolean } | null) => [
  { href: "/match", label: "Ghép thẻ", Icon: Layers },
  { href: "/flashcards", label: "Học từ vựng", Icon: BookOpen },
  { href: "/history", label: "Lịch sử", Icon: History },
  { href: "/leaderboard", label: "Bảng xếp hạng", Icon: Trophy },
].filter((link) => {
  if (link.href === "/history") return user !== null;
  return true;
});

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- must read localStorage after mount to avoid hydration mismatch */
    const stored = localStorage.getItem("qthtm_theme") as "dark" | "light" | null;
    const resolved = stored ?? "dark";
    setTheme(resolved);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(resolved);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Close auth/mobile menus with Escape — keeps keyboard users from being
  // stuck behind an overlay when they tab past it.
  useEffect(() => {
    if (!authMenuOpen && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAuthMenuOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authMenuOpen, mobileOpen]);

  // Restore focus to the trigger button when an overlay closes via Escape so
  // keyboard navigation stays predictable.
  const authTriggerRef = useRef<HTMLButtonElement | null>(null);
  const lastTriggerRef = useRef<"auth" | "mobile" | null>(null);
  useEffect(() => {
    if (authMenuOpen) lastTriggerRef.current = "auth";
    else if (lastTriggerRef.current === "auth" && authTriggerRef.current) {
      authTriggerRef.current.focus();
      lastTriggerRef.current = null;
    }
  }, [authMenuOpen]);
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (mobileOpen) lastTriggerRef.current = "mobile";
    else if (lastTriggerRef.current === "mobile" && mobileTriggerRef.current) {
      mobileTriggerRef.current.focus();
      lastTriggerRef.current = null;
    }
  }, [mobileOpen]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("qthtm_theme", next);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(next);
  };
  const { user, isCloudEnabled, signInWithGoogle, signInAnon, signInAnonWithName, signOut, loading } = useAuth();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundEnabled();

  const handleToggleSound = () => {
    // The hook's `toggle()` flips the snapshot; we let it run, then play a
    // small confirmation so the user knows the button worked. We call
    // playSfx *after* the toggle so the demo sound respects the new state.
    toggleSound();
    if (!soundEnabled) playSfx("click");
  };

  return (
    <header className="header-bar">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-3">
        {/* ── Logo ── */}
        <Link href="/" className="hdr-logo shrink-0">
          <div className="hdr-logo-avatar">
            <div className="hdr-logo-avatar-inner">
              <img src="/profile-with-qr.png" alt="QTHTM" />
            </div>
          </div>
          <div className="hdr-logo-text hidden sm:flex">
            <span className="hdr-logo-title">QTHTM</span>
            <span className="hdr-logo-sub">Quiz System</span>
          </div>
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hdr-nav" aria-label="Điều hướng chính">
          {navLinks(user).map((link) => {
            const active = pathname === link.href;
            const Icon = link.Icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`hdr-link ${active ? "is-active" : ""}`}
              >
                <span className="hdr-link-icon" aria-hidden="true">
                  <Icon size={13} />
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right cluster: Flashcard due badge + Social + Auth + Mobile toggle ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Due flashcard indicator — only renders on flashcards routes */}
          <FlashcardDueIndicator />

          {/* Sound toggle */}
          <button
            onClick={handleToggleSound}
            aria-label={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
            title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
            className="hdr-burger"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 9, background: "rgba(15,22,45,0.4)", border: "1px solid rgba(51,65,85,0.3)", color: soundEnabled ? "#60a5fa" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#60a5fa"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = soundEnabled ? "#60a5fa" : "#64748b"; e.currentTarget.style.borderColor = "rgba(51,65,85,0.3)"; }}
          >
            {soundEnabled ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => { playSfx("click"); toggleTheme(); }}
            aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            className="hdr-burger"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 9, background: "rgba(15,22,45,0.4)", border: "1px solid rgba(51,65,85,0.3)", color: "#64748b", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#60a5fa"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "rgba(51,65,85,0.3)"; }}
          >
            {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
          </button>

          {/* Social */}
          <div className="hdr-social-card hidden md:flex">
            <a
              href="https://www.tiktok.com/@.duck23huy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="hdr-social hdr-tt"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.34a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.27z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/puin_2301/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="hdr-social hdr-ig"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                style={{ stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" }}
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
          </div>

          {/* Auth (cloud only) */}
          {isCloudEnabled && (
            <div className="relative">
              {loading ? (
                <div className="hdr-auth-skeleton" suppressHydrationWarning aria-hidden="true" />
              ) : user ? (
                <button
                  ref={authTriggerRef}
                  onClick={() => { playSfx("click"); setAuthMenuOpen((v) => !v); }}
                  className="hdr-user-btn"
                  aria-haspopup="menu"
                  aria-expanded={authMenuOpen}
                  aria-label={`Mở menu tài khoản của ${user.displayName}`}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className="hdr-user-avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="hdr-user-avatar-placeholder">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  ref={authTriggerRef}
                  onClick={() => { playSfx("click"); setAuthMenuOpen((v) => !v); }}
                  className="hdr-signin-btn"
                  suppressHydrationWarning
                  aria-haspopup="menu"
                  aria-expanded={authMenuOpen}
                  aria-label="Mở menu đăng nhập"
                >
                  <LogIn size={13} aria-hidden="true" />
                  <span className="hidden sm:inline">Đăng nhập</span>
                </button>
              )}

              {authMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => { playSfx("click"); setAuthMenuOpen(false); }}
                  />
                  <div className="hdr-auth-menu">
                    {user ? (
                      <>
                        <div className="hdr-auth-menu-header">
                          <div className="hdr-auth-user-info">
                            <div className="hdr-auth-user-avatar">
                              {user.photoURL ? (
                                <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" />
                              ) : (
                                <span>{user.displayName.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="hdr-auth-user-text">
                              <p className="hdr-auth-menu-name">{user.displayName}</p>
                              {user.email && (
                                <p className="hdr-auth-menu-email">{user.email}</p>
                              )}
                            </div>
                          </div>
                          {user.isAnonymous && (
                            <span className="hdr-auth-badge">Khách</span>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            playSfx("click");
                            const confirmed = window.confirm("Bạn có chắc chắn muốn đăng xuất?\nLịch sử của bạn vẫn được lưu cục bộ trên máy này.");
                            if (!confirmed) return;
                            setAuthMenuOpen(false);
                            try {
                              await signOut();
                              playSfx("complete");
                            } catch {
                              playSfx("wrong");
                            }
                          }}
                          className="hdr-auth-menu-item"
                        >
                          <LogOut size={14} />
                          <span>Đăng xuất</span>
                        </button>
                        {user.isAnonymous && (
                          <button
                            onClick={async () => {
                              playSfx("click");
                              try {
                                await signInWithGoogle();
                                setAuthMenuOpen(false);
                                playSfx("complete");
                              } catch (err) {
                                if ((err as { code?: string }).code !== "auth/popup-closed-by-user") {
                                  console.error(err);
                                  playSfx("wrong");
                                }
                              }
                            }}
                            className="hdr-auth-menu-item"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Nâng cấp lên Google</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={async () => {
                            playSfx("click");
                            try {
                              await signInWithGoogle();
                              setAuthMenuOpen(false);
                              playSfx("complete");
                            } catch (err) {
                              if ((err as { code?: string }).code !== "auth/popup-closed-by-user") {
                                  console.error(err);
                                  playSfx("wrong");
                                }
                            }
                          }}
                          className="hdr-auth-menu-item"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          <span>Đăng nhập với Google</span>
                        </button>
                        <button
                          onClick={async () => {
                            playSfx("click");
                            try {
                              const savedName = getPlayerName();
                              if (savedName) {
                                await signInAnon();
                                setAuthMenuOpen(false);
                                playSfx("complete");
                              } else {
                                setAuthMenuOpen(false);
                                const name = prompt("Nhập tên của bạn để bắt đầu:");
                                if (name && name.trim().length >= 2) {
                                  await signInAnonWithName(name.trim());
                                  playSfx("complete");
                                } else if (name !== null) {
                                  playSfx("wrong");
                                }
                              }
                            } catch (err) {
                              if ((err as { code?: string }).code !== "auth/popup-closed-by-user") {
                                  console.error(err);
                                  playSfx("wrong");
                                }
                            }
                          }}
                          className="hdr-auth-menu-item"
                        >
                          <LogIn size={14} />
                          <span>Tiếp tục với tư cách Khách</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mobile burger */}
          <button
            ref={mobileTriggerRef}
            className="hdr-burger sm:hidden"
            onClick={() => { playSfx("click"); setMobileOpen((v) => !v); }}
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileOpen}
            aria-controls="hdr-mobile-menu"
          >
            {mobileOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* ── Bottom accent line ── */}
      <div className="header-accent" aria-hidden="true" />

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <nav id="hdr-mobile-menu" className="hdr-menu sm:hidden" aria-label="Menu di động">
          {navLinks(user).map((link) => {
            const active = pathname === link.href;
            const Icon = link.Icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`hdr-link ${active ? "is-active" : ""}`}
                onClick={() => { playSfx("click"); setMobileOpen(false); }}
              >
                <span className="hdr-link-icon" aria-hidden="true">
                  <Icon size={15} />
                </span>
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={() => { playSfx("click"); toggleTheme(); setMobileOpen(false); }}
            className="hdr-link"
          >
            <span className="hdr-link-icon" aria-hidden="true">
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </span>
            Chế độ {theme === "dark" ? "sáng" : "tối"}
          </button>
        </nav>
      )}
    </header>
  );
}