"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useHasMounted } from "@/hooks/use-has-mounted";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();

  if (!mounted) {
    return <button className="theme-toggle" aria-hidden="true" tabIndex={-1} />;
  }

  const cycle: Array<{ id: "light" | "dark" | "system"; icon: React.ReactNode; label: string }> = [
    { id: "light", icon: <Sun size={16} />, label: "Sáng" },
    { id: "dark", icon: <Moon size={16} />, label: "Tối" },
    { id: "system", icon: <Monitor size={16} />, label: "Hệ thống" },
  ];
  // Lookup kept for reference; the cycle itself is rendered below and
  // each button reads `theme === c.id` directly.
  const cycleIndex = Math.max(
    0,
    cycle.findIndex((c) => c.id === theme),
  );

  return (
    <div
      className="theme-toggle-group"
      role="radiogroup"
      aria-label="Chế độ giao diện"
      data-active-index={cycleIndex}
    >
      {cycle.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={theme === c.id}
          title={c.label}
          aria-label={c.label}
          className={`theme-toggle-btn ${theme === c.id ? "is-active" : ""}`}
          onClick={() => setTheme(c.id)}
        >
          {c.icon}
        </button>
      ))}
    </div>
  );
}
