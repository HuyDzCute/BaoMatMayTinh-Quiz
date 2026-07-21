"use client";
import {
  BookOpen,
  Terminal,
  Globe,
  GraduationCap,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

const ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  terminal: Terminal,
  globe: Globe,
  "graduation-cap": GraduationCap,
  "file-text": FileText,
};

/**
 * Sanitize a color string before letting it touch an inline `style`. React
 * does escape attribute values, but inline styles go through
 * `setAttribute('style', …)` raw, so an over-permissive value like
 * `"red; background:url(...)"` would be honored. Keep this strict.
 */
function safeColor(value: string | undefined, fallback: string): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
  if (/^(rgb|rgba|hsl|hsla)\s*\(/i.test(v)) return v;
  const NAMED = new Set([
    "transparent", "currentColor", "inherit", "initial", "unset",
    "red","green","blue","yellow","orange","purple","pink","gray","grey",
    "black","white","brown","cyan","magenta","lime","navy","teal",
  ]);
  return NAMED.has(v.toLowerCase()) ? v : fallback;
}

export default function FlashcardSetIcon({
  name,
  size = 20,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const Icon = ICONS[name] ?? BookOpen;
  // First paint uses BookOpen to avoid hydration mismatch from dynamic lookup.
  const RenderedIcon = hydrated ? Icon : BookOpen;
  const safe = safeColor(color, "#3b82f6");
  return <RenderedIcon size={size} style={safe ? { color: safe } : undefined} />;
}
