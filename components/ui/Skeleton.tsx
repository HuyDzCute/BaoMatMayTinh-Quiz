"use client";

import { CSSProperties } from "react";

type Props = {
  width?: number | string;
  height?: number | string;
  rounded?: number | string;
  className?: string;
  style?: CSSProperties;
};

export default function Skeleton({
  width = "100%",
  height = 16,
  rounded = 6,
  className,
  style,
}: Props) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton ${className ?? ""}`}
      style={{
        display: "inline-block",
        width,
        height,
        borderRadius: typeof rounded === "number" ? `${rounded}px` : rounded,
        ...style,
      }}
    />
  );
}

export function SkeletonText({
  lines = 3,
  lastWidth = "60%",
}: {
  lines?: number;
  lastWidth?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? lastWidth : "100%"} rounded={4} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: "var(--card-bg, #fff)",
        border: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        gap: 12,
      }}
    >
      <Skeleton width={40} height={40} rounded={20} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton height={14} width="40%" rounded={4} />
        <Skeleton height={10} width="80%" rounded={4} />
        <Skeleton height={10} width="65%" rounded={4} />
      </div>
    </div>
  );
}
